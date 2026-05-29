"""
文档处理管线：解析 -> 分块 -> 向量化 -> 入库

支持 PDF（PyMuPDF 逐页提取）、Markdown、纯文本三种格式。
文档元数据使用 JSON 文件持久化，避免额外依赖。
"""

import uuid
import os
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings
from llama_index.embeddings.ollama import OllamaEmbedding

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


def get_or_create_collection(name: str = None):
    """获取或创建向量集合，使用余弦距离。默认使用当前激活的知识库。"""
    if name is None:
        name = get_active_collection()
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


# ============================================================================
# 文档元数据管理（使用 JSON 文件持久化）
# ============================================================================

def _get_meta_file(collection_name: str = None) -> str:
    """每个知识库独立的元数据文件"""
    if collection_name is None:
        collection_name = get_active_collection()
    return os.path.join(CHROMA_PERSIST_DIR, f"doc_meta_{collection_name}.json")


def _load_meta() -> Dict[str, Dict[str, Any]]:
    """从 JSON 文件加载文档元数据"""
    meta_file = _get_meta_file()
    if not os.path.exists(meta_file):
        return {}
    try:
        with open(meta_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_meta(meta: Dict[str, Dict[str, Any]]) -> None:
    """保存文档元数据到 JSON 文件"""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    with open(_get_meta_file(), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)


def save_document_meta(
    doc_id: str,
    filename: str,
    source_type: str,
    page_count: Optional[int],
    chunk_count: int,
) -> None:
    """保存文档元数据"""
    meta = _load_meta()
    tz = timezone(timedelta(hours=8))  # 北京时间 CST
    created_at = datetime.now(tz).isoformat()
    meta[doc_id] = {
        "filename": filename,
        "source_type": source_type,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "created_at": created_at,
    }
    _save_meta(meta)


def get_all_documents() -> List[Dict[str, Any]]:
    """获取所有已索引文档列表"""
    meta = _load_meta()
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
    # 按创建时间倒序
    docs.sort(key=lambda d: d["created_at"], reverse=True)
    return docs


def delete_document(doc_id: str) -> int:
    """删除文档及其所有 chunk，返回删除的 chunk 数量"""
    # 1. 删除主集合中的 chunk
    collection = get_or_create_collection()
    try:
        existing = collection.get(where={"document_id": doc_id})
    except Exception:
        existing = {"ids": []}

    deleted_count = 0
    if existing.get("ids"):
        collection.delete(ids=existing["ids"])
        deleted_count = len(existing["ids"])

    # 2. 删除元数据
    meta = _load_meta()
    meta.pop(doc_id, None)
    _save_meta(meta)

    return deleted_count


# ============================================================================
# 文档解析
# ============================================================================


def parse_pdf(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    """
    使用 PyMuPDF 逐页解析 PDF。
    返回: (chunks_meta_list, page_count)
      每个 chunk: {text, page_number, chunk_index}
    """
    import fitz  # PyMuPDF

    doc = fitz.open(file_path)
    all_chunks = []

    for page_num in range(len(doc)):
        text = doc[page_num].get_text()
        if not text.strip():
            continue
        chunks = _split_text(text)
        for ci, chunk in enumerate(chunks):
            all_chunks.append({
                "text": chunk,
                "page_number": page_num + 1,   # 1-indexed 页码
                "chunk_index": ci,
            })

    page_count = len(doc)
    doc.close()
    return all_chunks, page_count


def parse_markdown(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    """解析 Markdown 文件，无页码概念，page_count 返回 0 表示不适用"""
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def parse_txt(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    """解析纯文本文件，逻辑同 Markdown"""
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()

    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def parse_docx(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    """解析 Word (.docx) 文件，提取段落文本"""
    from docx import Document

    doc = Document(file_path)
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)

    full_text = "\n".join(paragraphs)
    chunks = _split_text(full_text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def _split_text(text: str) -> List[str]:
    """简单滑动窗口分块，中文友好"""
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def parse_document(file_path: str, source_type: str) -> Tuple[List[Dict[str, Any]], int]:
    """
    根据文件类型分发解析器。
    返回: (chunks_meta_list, page_count)
    """
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

# 全局单例 embedding 模型，避免重复初始化
_embed_model: Optional[OllamaEmbedding] = None


def get_embed_model() -> OllamaEmbedding:
    """获取 Ollama Embedding 模型单例"""
    global _embed_model
    if _embed_model is None:
        _embed_model = OllamaEmbedding(
            model_name=EMBEDDING_MODEL,
            base_url=OLLAMA_BASE_URL,
        )
    return _embed_model


def index_document(
    file_path: str,
    filename: str,
    source_type: str,
) -> Tuple[str, int, Optional[int]]:
    """
    完整处理管线：解析 -> 分块 -> 向量化 -> 入库

    返回: (doc_id, chunk_count, page_count)
      page_count 对非 PDF 文件返回 None
    """
    # Step 1: 解析文档
    chunks_meta, page_count = parse_document(file_path, source_type)

    if not chunks_meta:
        raise ValueError("文档无有效文本内容，无法索引")

    doc_id = str(uuid.uuid4())

    # Step 2: 向量化每个 chunk
    collection = get_or_create_collection()
    embed_model = get_embed_model()

    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for cm in chunks_meta:
        chunk_id = str(uuid.uuid4())
        # 调用 Ollama 生成 embedding 向量
        embedding = embed_model.get_text_embedding(cm["text"])

        ids.append(chunk_id)
        embeddings.append(embedding)
        documents.append(cm["text"])
        metadatas.append({
            "document_id": doc_id,
            "filename": filename,
            "page_number": cm["page_number"] if cm["page_number"] is not None else -1,
            "chunk_index": cm["chunk_index"],
            "source_type": source_type,
        })

    # Step 3: 批量写入 ChromaDB
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    # Step 4: 保存文档元数据
    save_document_meta(
        doc_id=doc_id,
        filename=filename,
        source_type=source_type,
        page_count=page_count if page_count > 0 else None,
        chunk_count=len(chunks_meta),
    )

    return doc_id, len(chunks_meta), page_count if page_count > 0 else None
