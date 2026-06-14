"""
文档处理管线：解析 -> 分块 -> 向量化 -> 入库

支持 PDF（PyMuPDF 逐页提取）、Markdown、纯文本、DOCX 四种格式。
文档元数据使用 JSON 文件持久化（按用户隔离）。
ChromaDB 集合命名：{user_id}_{kb_name}（多用户隔离）。
"""

import uuid
import os
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.core.node_parser import SentenceSplitter
import requests as _requests
import httpx

from config import (
    CHROMA_PERSIST_DIR,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_MODEL,
    OLLAMA_BASE_URL,
    get_active_collection,
    list_kb_collections,
    add_kb_collection,
)

# ============================================================================
# ChromaDB 客户端管理
# ============================================================================


def get_chroma_client() -> chromadb.PersistentClient:
    """获取 ChromaDB 持久化客户端"""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    return chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def _make_collection_name(name: str, user_id: str | None = None) -> str:
    """生成用户隔离的集合名称：{user_id}_{name}"""
    if user_id:
        return f"{user_id}_{name}"
    return name


def get_or_create_collection(name: str = None, user_id: str | None = None):
    """获取或创建向量集合（按用户隔离）。name 是知识库名，内部会加用户前缀。"""
    if name is None:
        name = get_active_collection(user_id=user_id)
    full_name = _make_collection_name(name, user_id)
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=full_name,
        metadata={"hnsw:space": "cosine"},
    )


# ============================================================================
# 文档元数据管理（JSON 文件，按用户隔离）
# ============================================================================

def _get_meta_file(collection_name: str = None, user_id: str | None = None) -> str:
    """每个用户 + 每个知识库独立的元数据文件"""
    if collection_name is None:
        collection_name = get_active_collection(user_id=user_id)
    if user_id:
        return os.path.join(CHROMA_PERSIST_DIR, f"doc_meta_{user_id}_{collection_name}.json")
    return os.path.join(CHROMA_PERSIST_DIR, f"doc_meta_{collection_name}.json")


def _load_meta(user_id: str | None = None) -> Dict[str, Dict[str, Any]]:
    """从 JSON 文件加载文档元数据"""
    meta_file = _get_meta_file(user_id=user_id)
    if not os.path.exists(meta_file):
        return {}
    try:
        with open(meta_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_meta(meta: Dict[str, Dict[str, Any]], user_id: str | None = None) -> None:
    """保存文档元数据到 JSON 文件"""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    with open(_get_meta_file(user_id=user_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def save_document_meta(
    doc_id: str,
    filename: str,
    source_type: str,
    page_count: Optional[int],
    chunk_count: int,
    user_id: str | None = None,
) -> None:
    """保存文档元数据"""
    meta = _load_meta(user_id=user_id)
    tz = timezone(timedelta(hours=8))  # 北京时间 CST
    created_at = datetime.now(tz).isoformat()
    meta[doc_id] = {
        "filename": filename,
        "source_type": source_type,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "created_at": created_at,
    }
    _save_meta(meta, user_id=user_id)


def get_all_documents(user_id: str | None = None) -> List[Dict[str, Any]]:
    """获取所有已索引文档列表"""
    meta = _load_meta(user_id=user_id)
    docs = []
    for doc_id, info in meta.items():
        docs.append({
            "id": doc_id,
            "filename": info["filename"],
            "source_type": info["source_type"],
            "page_count": info.get("page_count"),
            "chunk_count": info["chunk_count"],
            "created_at": info["created_at"],
        })
    docs.sort(key=lambda d: d["created_at"], reverse=True)
    return docs


def delete_document(doc_id: str, user_id: str | None = None) -> int:
    """删除文档及其所有 chunk，返回删除的 chunk 数量"""
    collection = get_or_create_collection(user_id=user_id)
    try:
        existing = collection.get(where={"document_id": doc_id})
    except Exception:
        existing = {"ids": []}

    deleted_count = 0
    if existing.get("ids"):
        collection.delete(ids=existing["ids"])
        deleted_count = len(existing["ids"])

    meta = _load_meta(user_id=user_id)
    meta.pop(doc_id, None)
    _save_meta(meta, user_id=user_id)

    return deleted_count


# ============================================================================
# 文本清洗
# ============================================================================

def clean_text(text: str) -> str:
    """基础文本清洗：去排版噪声，保留语义内容"""
    import re

    # 1. 去除不可见控制字符（保留常见换行和制表符）
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # 2. 每行去首尾空白
    lines = [l.strip() for l in text.split("\n")]

    # 3. 去纯页码行（单独一行只有 1-4 位数字）
    lines = [l for l in lines if not re.fullmatch(r"\d{1,4}", l)]

    # 4. 去页眉页脚碎片（行内容 < 20 字符的极短行）
    lines = [l for l in lines if len(l) >= 20]

    # 5. 合并多余空白：3个以上换行 → 2个
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 6. 合并多余空格和制表符
    text = re.sub(r"[ \t]{2,}", " ", text)

    return text


# ============================================================================
# 文档解析
# ============================================================================

_ocr_model = None


def _get_ocr():
    """获取 PaddleOCR 实例（CPU 模式，避免和 LLM 抢 GPU 内存）"""
    global _ocr_model
    if _ocr_model is None:
        from paddleocr import PaddleOCR
        _ocr_model = PaddleOCR(lang="ch", use_gpu=False)
    return _ocr_model


def parse_pdf(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    import fitz

    doc = fitz.open(file_path)
    page_count = len(doc)

    # Step 1: 逐页提取文本 + OCR 回退
    page_texts = []  # [(page_num, text), ...]
    for page_num in range(page_count):
        text = doc[page_num].get_text()

        if len(text.strip()) < 20:
            try:
                pix = doc[page_num].get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                ocr = _get_ocr()
                result = ocr.ocr(img_bytes, cls=True)
                if result and result[0]:
                    text = "\n".join(
                        [line[1][0] for line in result[0]]
                    )
            except Exception:
                pass

        if text.strip():
            page_texts.append((page_num + 1, text))

    doc.close()

    if not page_texts:
        return [], page_count

    # Step 2: 按字符位置追踪页码，全局拼接后统一分块
    # 每页文本前面加一个页标记，同时记录每页在全文中的字符起止位置
    full_text_parts = []
    page_ranges = []  # [(page_num, char_start, char_end), ...]
    offset = 0

    for page_num, text in page_texts:
        full_text_parts.append(text)
        page_ranges.append((page_num, offset, offset + len(text)))
        offset += len(text) + 1  # +1 for the newline between pages

    full_text = clean_text("\n".join(full_text_parts))

    # Step 3: 全局分块，跨页自然合并
    chunks = _split_text(full_text)

    # Step 4: 根据 chunk 开头字符位置，反查所属页码
    all_chunks = []
    chunk_index = 0
    for chunk in chunks:
        # 找到 chunk 在 full_text 中的开始位置
        pos = full_text.find(chunk)
        if pos == -1:
            pos = 0

        # 查找该位置落在哪一页
        page_number = page_ranges[0][0] if page_ranges else 0
        for pn, start, end in page_ranges:
            if start <= pos <= end:
                page_number = pn
                break

        all_chunks.append({
            "text": chunk.strip(),
            "page_number": page_number,
            "chunk_index": chunk_index,
        })
        chunk_index += 1

    return all_chunks, page_count


def parse_markdown(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    text = clean_text(text)
    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def parse_txt(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    text = clean_text(text)
    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def parse_docx(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    from docx import Document

    doc = Document(file_path)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)

    full_text = clean_text("\n".join(paragraphs))
    chunks = _split_text(full_text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


_splitter = SentenceSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    paragraph_separator="\n\n",
    secondary_chunking_regex="[^,.;。？！]+[,.;。？！]?|[,.;。？！]",
)


def _split_text(text: str) -> List[str]:
    return _splitter.split_text(text)


def parse_document(file_path: str, source_type: str) -> Tuple[List[Dict[str, Any]], int]:
    parsers = {
        "pdf": parse_pdf,
        "markdown": parse_markdown,
        "txt": parse_txt,
        "docx": parse_docx,
    }
    parser = parsers.get(source_type)
    if not parser:
        raise ValueError(f"不支持的文件类型: {source_type}")
    return parser(file_path)


# ============================================================================
# Embedding 向量化 + 入库
# ============================================================================

# HTTP 客户端单例（keep-alive 复用连接，避免 Windows localhost DNS 解析开销）
_http_client: Optional[httpx.Client] = None


def _get_http_client() -> httpx.Client:
    global _http_client
    if _http_client is None:
        _http_client = httpx.Client(timeout=httpx.Timeout(60, connect=10))
    return _http_client


class _RequestsEmbedModel:

    def get_text_embedding(self, text: str):
        client = _get_http_client()
        r = client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": EMBEDDING_MODEL, "input": text},
        )
        r.raise_for_status()
        return r.json()["embeddings"][0]

    def get_text_embeddings_batch(self, texts: list) -> list:
        """批量嵌入：一次请求处理所有文本块，速度远快于逐块调用"""
        client = _get_http_client()
        r = client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": EMBEDDING_MODEL, "input": texts},
            timeout=300,
        )
        r.raise_for_status()
        return r.json()["embeddings"]


_embed_model: Optional[_RequestsEmbedModel] = None


def get_embed_model() -> _RequestsEmbedModel:
    global _embed_model
    if _embed_model is None:
        _embed_model = _RequestsEmbedModel()
    return _embed_model


def index_document(
    file_path: str,
    filename: str,
    source_type: str,
    user_id: str | None = None,
) -> Tuple[str, int, Optional[int]]:
    """
    完整处理管线：解析 -> 分块 -> 向量化 -> 入库
    返回: (doc_id, chunk_count, page_count)
    """
    chunks_meta, page_count = parse_document(file_path, source_type)

    if not chunks_meta:
        raise ValueError("文档无有效文本内容，无法索引")

    doc_id = str(uuid.uuid4())

    collection = get_or_create_collection(user_id=user_id)
    embed_model = get_embed_model()

    # 批量获取所有块的嵌入向量（一次 API 调用）
    chunk_texts = [cm["text"] for cm in chunks_meta]
    all_embeddings = embed_model.get_text_embeddings_batch(chunk_texts)

    ids = []
    documents = []
    metadatas = []
    for i, cm in enumerate(chunks_meta):
        chunk_id = str(uuid.uuid4())
        ids.append(chunk_id)
        documents.append(cm["text"])
        metadatas.append({
            "document_id": doc_id,
            "filename": filename,
            "page_number": cm["page_number"] if cm["page_number"] is not None else -1,
            "chunk_index": cm["chunk_index"],
            "source_type": source_type,
        })

    embeddings = all_embeddings

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    save_document_meta(
        doc_id=doc_id,
        filename=filename,
        source_type=source_type,
        page_count=page_count if page_count > 0 else None,
        chunk_count=len(chunks_meta),
        user_id=user_id,
    )

    return doc_id, len(chunks_meta), page_count if page_count > 0 else None
