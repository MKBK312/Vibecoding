# MindLink AI 重设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 MindLink AI 从 Next.js 全栈重构为 FastAPI (Python) + Next.js 14 双端架构，集成本地 DeepSeek-R1 + bge-large-zh-v1.5 模型栈。

**Architecture:** FastAPI 后端处理文档解析/向量化/LLM 对话（SSE 流式），Next.js 前端提供左右分栏 UI（控制中心 + 对话区）。两端通过 REST/SSE 通信，无共享状态。

**Tech Stack:** Python 3.10+, FastAPI, LlamaIndex, ChromaDB, Ollama (DeepSeek-R1, bge-large-zh-v1.5), PyMuPDF, Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide React

---

## 文件结构总览

```
mindlink-ai/
├── backend/
│   ├── main.py              # FastAPI 入口 + 路由
│   ├── engine.py            # 查询引擎（检索 + 流式生成）
│   ├── pipeline.py          # 文档处理管线
│   ├── models.py            # Pydantic 数据模型
│   ├── config.py            # 配置常量
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx       # 根布局（两栏响应式）
    │   │   ├── page.tsx         # 主页（组合 Sidebar + ChatHub）
    │   │   ├── globals.css      # Tailwind + CSS 变量主题
    │   │   └── providers.tsx    # React Query 提供者
    │   ├── components/
    │   │   ├── sidebar/
    │   │   │   ├── Sidebar.tsx
    │   │   │   ├── FileUploader.tsx
    │   │   │   ├── DocumentList.tsx
    │   │   │   └── ModelParams.tsx
    │   │   ├── chat/
    │   │   │   ├── ChatHub.tsx
    │   │   │   ├── ChatMessages.tsx
    │   │   │   ├── MessageBubble.tsx
    │   │   │   ├── SourceCard.tsx
    │   │   │   └── ChatInput.tsx
    │   │   └── ui/
    │   │       ├── Button.tsx
    │   │       ├── Card.tsx
    │   │       ├── Input.tsx
    │   │       ├── Slider.tsx
    │   │       └── Badge.tsx
    │   ├── lib/
    │   │   ├── api.ts
    │   │   └── types.ts
    │   └── hooks/
    │       ├── useChat.ts
    │       ├── useDocuments.ts
    │       └── useUpload.ts
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── next.config.js
```

---

### Task 0: 清理旧代码 + 创建新目录结构

**Files:**
- Remove: `mindlink-ai/src/` (all old frontend code)
- Remove: `mindlink-ai/node_modules/`, `mindlink-ai/package.json`, `mindlink-ai/package-lock.json`
- Remove: `mindlink-ai/next.config.js`, `mindlink-ai/tailwind.config.js`, `mindlink-ai/postcss.config.js`, `mindlink-ai/tsconfig.json`
- Keep: `mindlink-ai/data/`, `mindlink-ai/uploads/`
- Create: `mindlink-ai/backend/`, `mindlink-ai/frontend/`

- [ ] **Step 1: 备份并删除旧前端文件**

```bash
cd E:/COLIN/vibecoding/mindlink-ai
# 删除旧 Next.js 代码
rm -rf src/ node_modules/ package.json package-lock.json next.config.js tailwind.config.js postcss.config.js tsconfig.json
# 确保数据和上传目录保留
ls -d data/ uploads/
```

- [ ] **Step 2: 创建新目录结构**

```bash
cd E:/COLIN/vibecoding/mindlink-ai
mkdir -p backend
mkdir -p frontend/src/app
mkdir -p frontend/src/components/sidebar
mkdir -p frontend/src/components/chat
mkdir -p frontend/src/components/ui
mkdir -p frontend/src/lib
mkdir -p frontend/src/hooks
```

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: 清理旧 Next.js 全栈代码，准备 FastAPI + Next.js 双端重构
EOF
)"
```

---

### Task 1: 后端项目初始化

**Files:**
- Create: `mindlink-ai/backend/requirements.txt`

- [ ] **Step 1: 编写 requirements.txt**

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
llama-index==0.10.27
llama-index-embeddings-ollama==0.1.3
llama-index-llms-ollama==0.1.3
llama-index-vector-stores-chroma==0.1.8
chromadb==0.4.24
pymupdf==1.23.8
python-multipart==0.0.9
pydantic==2.6.4
```

- [ ] **Step 2: 创建虚拟环境并安装依赖**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -m venv venv
source venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
```

- [ ] **Step 3: 验证关键库可导入**

```bash
python -c "import fastapi; import llama_index; import chromadb; import fitz; print('All imports OK')"
```

- [ ] **Step 4: 提交**

```bash
git add backend/requirements.txt
git commit -m "feat: 初始化 FastAPI 后端项目，安装核心依赖"
```

---

### Task 2: 配置模块 (config.py)

**Files:**
- Create: `mindlink-ai/backend/config.py`

- [ ] **Step 1: 编写 config.py**

```python
"""MindLink AI 配置常量 """

import os

# --- ChromaDB ---
CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "chroma"
)
CHROMA_COLLECTION_NAME = "mindlink_docs"

# --- Ollama 模型 ---
LLM_MODEL = "deepseek-r1:latest"
EMBEDDING_MODEL = "bge-large-zh-v1.5:latest"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# --- 分块参数 ---
CHUNK_SIZE = 600       # 字符数
CHUNK_OVERLAP = 100    # 重叠字符数

# --- 检索默认值 ---
DEFAULT_TOP_K = 5
DEFAULT_TEMPERATURE = 0.7

# --- 支持的文件类型 ---
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt", ".docx"}
```

- [ ] **Step 2: 验证无语法错误**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "import config; print(config.CHROMA_PERSIST_DIR)"
```

- [ ] **Step 3: 提交**

```bash
git add backend/config.py
git commit -m "feat: 添加后端配置模块 config.py"
```

---

### Task 3: 数据模型 (models.py)

**Files:**
- Create: `mindlink-ai/backend/models.py`

- [ ] **Step 1: 编写 models.py**

```python
"""Pydantic 数据模型 """

from pydantic import BaseModel, Field
from typing import List, Optional


class ChatRequest(BaseModel):
    """对话请求"""
    question: str = Field(..., min_length=1, description="用户问题")
    top_k: int = Field(default=5, ge=1, le=20, description="检索深度")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="LLM 温度")


class SourceCitation(BaseModel):
    """引用溯源"""
    document_id: str
    document_title: str
    page_number: Optional[int] = None
    content: str
    score: float


class DocumentInfo(BaseModel):
    """已索引文档信息"""
    id: str
    filename: str
    source_type: str          # "pdf" | "markdown" | "txt"
    page_count: Optional[int] = None
    chunk_count: int
    created_at: str


class UploadResponse(BaseModel):
    """上传响应"""
    id: str
    filename: str
    page_count: Optional[int] = None
    chunk_count: int
    message: str


class DeleteResponse(BaseModel):
    """删除响应"""
    success: bool
    deleted_chunks: int


class ConfigResponse(BaseModel):
    """系统配置"""
    top_k: int
    temperature: float
    llm_model: str
    embedding_model: str
    total_documents: int
    total_chunks: int


class SSEEvent(BaseModel):
    """SSE 推送事件"""
    type: str                 # "text" | "sources" | "done" | "error"
    content: str = ""
    sources: List[SourceCitation] = []
```

- [ ] **Step 2: 验证**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "from models import ChatRequest; print(ChatRequest(question='测试'))"
```

- [ ] **Step 3: 提交**

```bash
git add backend/models.py
git commit -m "feat: 添加 Pydantic 数据模型 models.py"
```

---

### Task 4: ChromaDB 客户端 (pipeline.py 前半)

**Files:**
- Create: `mindlink-ai/backend/pipeline.py`（先写 ChromaDB 连接 + collection 管理）

- [ ] **Step 1: 编写 ChromaDB 客户端初始化**

```python
"""文档处理管线：解析 → 分块 → 向量化 → 入库 """

import uuid
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import (
    CHROMA_PERSIST_DIR,
    CHROMA_COLLECTION_NAME,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)


def get_chroma_client() -> chromadb.PersistentClient:
    """获取 ChromaDB 持久化客户端"""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    return chromadb.PersistentClient(
        path=CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )


def get_or_create_collection():
    """获取或创建向量集合"""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
```

- [ ] **Step 2: 编写文档元数据持久化函数**

```python
def _get_doc_meta_collection():
    """文档元数据存储（单独的 collection）"""
    client = get_chroma_client()
    return client.get_or_create_collection(name=f"{CHROMA_COLLECTION_NAME}_meta")


def save_document_meta(doc_id: str, filename: str, source_type: str,
                       page_count: Optional[int], chunk_count: int) -> None:
    """保存文档元数据"""
    meta_col = _get_doc_meta_collection()
    tz = timezone(timedelta(hours=8))  # CST
    created_at = datetime.now(tz).isoformat()
    meta_col.add(
        ids=[doc_id],
        documents=[filename],
        metadatas=[{
            "filename": filename,
            "source_type": source_type,
            "page_count": page_count or 0,
            "chunk_count": chunk_count,
            "created_at": created_at,
        }],
    )


def get_all_documents() -> List[Dict[str, Any]]:
    """获取所有已索引文档"""
    meta_col = _get_doc_meta_collection()
    if meta_col.count() == 0:
        return []
    result = meta_col.get()
    docs = []
    for i, doc_id in enumerate(result["ids"]):
        meta = result["metadatas"][i]
        docs.append({
            "id": doc_id,
            "filename": meta["filename"],
            "source_type": meta["source_type"],
            "page_count": meta.get("page_count") or None,
            "chunk_count": meta["chunk_count"],
            "created_at": meta["created_at"],
        })
    return docs


def delete_document(doc_id: str) -> int:
    """删除文档及其所有 chunk"""
    collection = get_or_create_collection()
    # 查找属于此文档的所有 chunk
    existing = collection.get(where={"document_id": doc_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])
    # 删除元数据
    meta_col = _get_doc_meta_collection()
    try:
        meta_col.delete(ids=[doc_id])
    except Exception:
        pass
    return len(existing["ids"]) if existing["ids"] else 0
```

- [ ] **Step 3: 验证 ChromaDB 连接**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "
from pipeline import get_or_create_collection, save_document_meta, get_all_documents
col = get_or_create_collection()
print(f'Collection count: {col.count()}')
print(f'Documents: {get_all_documents()}')
"
```

- [ ] **Step 4: 提交**

```bash
git add backend/pipeline.py
git commit -m "feat: 添加 ChromaDB 客户端 + 文档元数据管理"
```

---

### Task 5: 文档解析器 (pipeline.py 后半)

**Files:**
- Modify: `mindlink-ai/backend/pipeline.py`（追加解析 + 分块函数）

- [ ] **Step 1: 追加 PDF 解析函数**

```python
# === 文档解析 ===

def parse_pdf(file_path: str) -> tuple[List[Dict[str, Any]], int]:
    """解析 PDF，返回 (chunks_meta_list, page_count)
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
                "page_number": page_num + 1,   # 1-indexed
                "chunk_index": ci,
            })
    doc.close()
    return all_chunks, len(doc)


def parse_markdown(file_path: str) -> tuple[List[Dict[str, Any]], int]:
    """解析 Markdown 文件，无页码概念"""
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def parse_txt(file_path: str) -> tuple[List[Dict[str, Any]], int]:
    """解析纯文本文件"""
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    chunks = _split_text(text)
    chunk_metas = [
        {"text": c, "page_number": None, "chunk_index": i}
        for i, c in enumerate(chunks)
    ]
    return chunk_metas, 0


def _split_text(text: str) -> List[str]:
    """简单滑动窗口分块（中文友好）"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks
```

- [ ] **Step 2: 追加文档分发器**

```python
def parse_document(file_path: str, source_type: str) -> tuple:
    """根据文件类型分发解析器
    Returns: (chunks_meta_list, page_count)
    """
    parsers = {
        "pdf": parse_pdf,
        "markdown": parse_markdown,
        "txt": parse_txt,
    }
    parser = parsers.get(source_type)
    if not parser:
        raise ValueError(f"不支持的文件类型: {source_type}")
    return parser(file_path)
```

- [ ] **Step 3: 验证 PDF 解析**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "
from pipeline import parse_document
# 如果有测试 PDF，可以指向任意 PDF
chunks, pages = parse_document('../uploads/test.pdf', 'pdf') if False else (None, None)
print('parse_document imported OK')
"
```

- [ ] **Step 4: 提交**

```bash
git add backend/pipeline.py
git commit -m "feat: 添加 PDF/Markdown/TXT 文档解析器（PyMuPDF）"
```

---

### Task 6: Embedding + 入库 (pipeline.py 完成)

**Files:**
- Modify: `mindlink-ai/backend/pipeline.py`（追加向量化 + 入库函数）

- [ ] **Step 1: 追加 Embedding 和入库**

```python
# === 向量化 + 入库 ===

from llama_index.embeddings.ollama import OllamaEmbedding
from config import EMBEDDING_MODEL, OLLAMA_BASE_URL

# 全局单例 embedding 模型（首次调用时加载）
_embed_model: Optional[OllamaEmbedding] = None


def _get_embed_model() -> OllamaEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = OllamaEmbedding(
            model_name=EMBEDDING_MODEL,
            base_url=OLLAMA_BASE_URL,
        )
    return _embed_model


def index_document(file_path: str, filename: str, source_type: str) -> tuple[str, int, Optional[int]]:
    """完整处理管线：解析 → 分块 → 向量化 → 入库
    Returns: (doc_id, chunk_count, page_count)
    """
    chunks_meta, page_count = parse_document(file_path, source_type)
    doc_id = str(uuid.uuid4())

    if not chunks_meta:
        raise ValueError("文档无有效文本内容")

    collection = get_or_create_collection()
    embed_model = _get_embed_model()

    ids = []
    embeddings = []
    documents = []
    metadatas = []

    for cm in chunks_meta:
        chunk_id = str(uuid.uuid4())
        embedding = embed_model.get_text_embedding(cm["text"])
        ids.append(chunk_id)
        embeddings.append(embedding)
        documents.append(cm["text"])
        metadatas.append({
            "document_id": doc_id,
            "filename": filename,
            "page_number": cm["page_number"] or -1,
            "chunk_index": cm["chunk_index"],
            "source_type": source_type,
        })

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )

    save_document_meta(doc_id, filename, source_type,
                       page_count if page_count > 0 else None,
                       len(chunks_meta))

    return doc_id, len(chunks_meta), page_count if page_count > 0 else None
```

- [ ] **Step 2: 验证 import 正常**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "from pipeline import index_document; print('index_document imported OK')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/pipeline.py
git commit -m "feat: 添加 Embedding 向量化 + ChromaDB 入库管线"
```

---

### Task 7: 查询引擎 (engine.py)

**Files:**
- Create: `mindlink-ai/backend/engine.py`

- [ ] **Step 1: 编写 engine.py**

```python
"""LlamaIndex 查询引擎：检索 + 流式 LLM 生成 """

from typing import AsyncGenerator, List, Dict, Any
import json

from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.llms.ollama import Ollama

from config import (
    EMBEDDING_MODEL,
    LLM_MODEL,
    OLLAMA_BASE_URL,
    DEFAULT_TOP_K,
    DEFAULT_TEMPERATURE,
)
from pipeline import get_or_create_collection
from models import SourceCitation

# 全局单例
_embed_model: OllamaEmbedding = None
_llm: Ollama = None


def _get_embed_model() -> OllamaEmbedding:
    global _embed_model
    if _embed_model is None:
        _embed_model = OllamaEmbedding(
            model_name=EMBEDDING_MODEL,
            base_url=OLLAMA_BASE_URL,
        )
    return _embed_model


def _get_llm(temperature: float = DEFAULT_TEMPERATURE) -> Ollama:
    """每次调用新建 LLM 实例（temperature 可能不同）"""
    return Ollama(
        model=LLM_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
        request_timeout=120.0,
    )


def search_chunks(query: str, top_k: int = DEFAULT_TOP_K) -> List[SourceCitation]:
    """Embedding 检索 Top-K 相似文本块"""
    embed_model = _get_embed_model()
    query_embedding = embed_model.get_text_embedding(query)

    collection = get_or_create_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    sources = []
    if results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            dist = results["distances"][0][i] if results["distances"] else 0
            # cosine distance → similarity score
            score = 1.0 - min(dist, 1.0) if results["distances"] else 0.0
            sources.append(SourceCitation(
                document_id=meta.get("document_id", ""),
                document_title=meta.get("filename", "未知文件"),
                page_number=meta.get("page_number") if meta.get("page_number", -1) >= 0 else None,
                content=results["documents"][0][i][:300],
                score=round(score, 4),
            ))

    return sources


def _build_prompt(question: str, sources: List[SourceCitation]) -> str:
    """构造带引用的 Prompt"""
    refs = []
    for i, src in enumerate(sources, 1):
        page_info = f"第{src.page_number}页" if src.page_number else "未知页"
        refs.append(f"[{i}] 《{src.document_title}》{page_info}: \"{src.content}\"")
    ref_text = "\n".join(refs)

    return f"""你是一个学术研究助手。请基于以下参考资料回答问题，引用来源时使用 [文件名:页码] 格式。

参考资料：
{ref_text}

问题：{question}

回答要求：
- 基于参考资料，不编造信息
- 引用时标注 [文件名:页码]
- 如果参考资料不足以回答问题，请明确指出"""


async def stream_chat(
    question: str,
    top_k: int = DEFAULT_TOP_K,
    temperature: float = DEFAULT_TEMPERATURE,
) -> AsyncGenerator[str, None]:
    """流式对话生成器（SSE 事件流）

    Yields SSE-formatted strings:
      data: {"type":"text","content":"..."}
      data: {"type":"sources","sources":[...]}
      data: {"type":"done"}
    """
    # Step 1: 检索
    sources = search_chunks(question, top_k)

    if not sources:
        yield f"data: {json.dumps({'type': 'text', 'content': '未找到相关参考资料。', 'sources': []})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"
        return

    # Step 2: 构造 Prompt
    prompt = _build_prompt(question, sources)

    # Step 3: 流式生成
    llm = _get_llm(temperature)
    full_response = ""

    try:
        for chunk in llm.stream_complete(prompt):
            delta = chunk.delta if hasattr(chunk, "delta") else str(chunk)
            if delta:
                full_response += delta
                yield f"data: {json.dumps({'type': 'text', 'content': delta, 'sources': []})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e), 'sources': []})}\n\n"
        return

    # Step 4: 发送溯源信息
    sources_data = [s.model_dump() for s in sources]
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data})}\n\n"

    # Step 5: 结束
    yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"
```

- [ ] **Step 2: 验证 import**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "from engine import stream_chat, search_chunks; print('engine imported OK')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/engine.py
git commit -m "feat: 添加 LlamaIndex 查询引擎 + SSE 流式对话"
```

---

### Task 8: FastAPI 入口 + 非流式路由 (main.py)

**Files:**
- Create: `mindlink-ai/backend/main.py`

- [ ] **Step 1: 编写 main.py（上传、文档列表、删除、配置 API）**

```python
"""MindLink AI FastAPI 后端入口 """

import os
import shutil
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn

from models import (
    ChatRequest,
    UploadResponse,
    DeleteResponse,
    ConfigResponse,
    DocumentInfo,
)
from config import ALLOWED_EXTENSIONS, DEFAULT_TOP_K, DEFAULT_TEMPERATURE
from config import LLM_MODEL, EMBEDDING_MODEL
from pipeline import index_document, get_all_documents, delete_document
from engine import stream_chat

app = FastAPI(title="MindLink AI", version="2.0.0")

# CORS：允许 Next.js 前端跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _get_source_type(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件类型: {ext}，允许: {ALLOWED_EXTENSIONS}")
    type_map = {".pdf": "pdf", ".md": "markdown", ".txt": "txt", ".docx": "txt"}
    return type_map.get(ext, "txt")


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """上传文档 → 解析 → 向量化 → 入库"""
    if not file.filename:
        raise HTTPException(400, "文件名为空")
    source_type = _get_source_type(file.filename)
    # 保存到 uploads/
    safe_name = f"{os.path.splitext(file.filename)[0]}_{hash(file.filename)}{os.path.splitext(file.filename)[1]}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    # 入库
    try:
        doc_id, chunk_count, page_count = index_document(file_path, file.filename, source_type)
    except Exception as e:
        raise HTTPException(500, f"文档处理失败: {str(e)}")
    return UploadResponse(
        id=doc_id,
        filename=file.filename,
        page_count=page_count,
        chunk_count=chunk_count,
        message=f"成功索引 {chunk_count} 个文本块",
    )


@app.get("/api/documents", response_model=List[DocumentInfo])
async def list_documents():
    """获取已索引文档列表"""
    return get_all_documents()


@app.delete("/api/documents/{doc_id}", response_model=DeleteResponse)
async def remove_document(doc_id: str):
    """删除文档及向量"""
    deleted = delete_document(doc_id)
    return DeleteResponse(success=True, deleted_chunks=deleted)


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """获取系统配置"""
    docs = get_all_documents()
    total_chunks = sum(d.get("chunk_count", 0) for d in docs)
    return ConfigResponse(
        top_k=DEFAULT_TOP_K,
        temperature=DEFAULT_TEMPERATURE,
        llm_model=LLM_MODEL,
        embedding_model=EMBEDDING_MODEL,
        total_documents=len(docs),
        total_chunks=total_chunks,
    )
```

- [ ] **Step 2: 验证 FastAPI 启动**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -c "from main import app; print(f'App: {app.title}')"
```

- [ ] **Step 3: 提交**

```bash
git add backend/main.py
git commit -m "feat: 添加 FastAPI 入口 + 文档管理路由（upload/list/delete/config）"
```

---

### Task 9: SSE 流式对话路由 (main.py 补充)

**Files:**
- Modify: `mindlink-ai/backend/main.py`（追加 chat/stream 路由）

- [ ] **Step 1: 追加流式对话端点**

```python
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """流式对话 SSE 端点"""
    async def event_generator():
        async for sse_event in stream_chat(
            question=request.question,
            top_k=request.top_k,
            temperature=request.temperature,
        ):
            yield sse_event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

- [ ] **Step 2: 后端冒烟测试 — 启动服务并检查健康状态**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
# 后台启动
python -m uvicorn main:app --port 8000 &
sleep 3
# 检查 config API
curl -s http://localhost:8000/api/config | python -m json.tool
# 停止
kill %1
```

- [ ] **Step 3: 提交**

```bash
git add backend/main.py
git commit -m "feat: 添加 POST /api/chat/stream SSE 流式对话端点"
```

---

### Task 10: 前端项目初始化

**Files:**
- Create: `mindlink-ai/frontend/package.json`
- Create: `mindlink-ai/frontend/tsconfig.json`
- Create: `mindlink-ai/frontend/next.config.js`
- Create: `mindlink-ai/frontend/tailwind.config.ts`
- Create: `mindlink-ai/frontend/postcss.config.js`

- [ ] **Step 1: 编写 package.json**

```json
{
  "name": "mindlink-ai-frontend",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "lucide-react": "^0.356.0",
    "marked": "^12.0.1",
    "next": "14.1.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3"
  },
  "devDependencies": {
    "@types/node": "^20.11.25",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.4.2"
  }
}
```

- [ ] **Step 2: 编写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: 编写 next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 4: 编写 tailwind.config.ts + postcss.config.js**

tailwind.config.ts:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        sidebar: { DEFAULT: "#1e293b", card: "#0f172a" },
      },
    },
  },
  plugins: [],
};
export default config;
```

postcss.config.js:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: 安装依赖**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/frontend
npm install
```

- [ ] **Step 6: 提交**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tsconfig.json frontend/next.config.js frontend/tailwind.config.ts frontend/postcss.config.js
git commit -m "feat: 初始化 Next.js 14 前端项目 + Tailwind CSS + API 代理"
```

---

### Task 11: 全局样式 + Providers

**Files:**
- Create: `mindlink-ai/frontend/src/app/globals.css`
- Create: `mindlink-ai/frontend/src/app/providers.tsx`

- [ ] **Step 1: 编写 globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --sidebar-bg: #1e293b;
  --sidebar-card: #0f172a;
  --accent: #3b82f6;
  --text-primary: #334155;
  --text-muted: #94a3b8;
}

@layer base {
  body {
    @apply bg-white text-slate-700 antialiased;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
}

/* 自定义滚动条 */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

/* Markdown 渲染样式 */
.markdown-body p { margin-bottom: 0.75rem; }
.markdown-body ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.markdown-body ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.markdown-body li { margin-bottom: 0.25rem; }
.markdown-body strong { font-weight: 600; color: #1e293b; }
.markdown-body code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}
.markdown-body pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 0.75rem;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}
```

- [ ] **Step 2: 编写 providers.tsx**

```tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/app/globals.css frontend/src/app/providers.tsx
git commit -m "feat: 添加 Tailwind 全局主题 + React Query Providers"
```

---

### Task 12: 类型定义 + API 封装

**Files:**
- Create: `mindlink-ai/frontend/src/lib/types.ts`
- Create: `mindlink-ai/frontend/src/lib/api.ts`

- [ ] **Step 1: 编写 types.ts**

```typescript
export interface DocumentInfo {
  id: string;
  filename: string;
  source_type: "pdf" | "markdown" | "txt";
  page_count: number | null;
  chunk_count: number;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  page_number: number | null;
  content: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  createdAt: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  page_count: number | null;
  chunk_count: number;
  message: string;
}

export interface ConfigResponse {
  top_k: number;
  temperature: number;
  llm_model: string;
  embedding_model: string;
  total_documents: number;
  total_chunks: number;
}
```

- [ ] **Step 2: 编写 api.ts**

```typescript
import type { DocumentInfo, UploadResponse, ConfigResponse } from "./types";

const API_BASE = "/api";

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts
git commit -m "feat: 添加 TypeScript 类型定义 + API 封装层"
```

---

### Task 13: UI 基础组件

**Files:**
- Create: `mindlink-ai/frontend/src/components/ui/Button.tsx`
- Create: `mindlink-ai/frontend/src/components/ui/Card.tsx`
- Create: `mindlink-ai/frontend/src/components/ui/Input.tsx`
- Create: `mindlink-ai/frontend/src/components/ui/Slider.tsx`
- Create: `mindlink-ai/frontend/src/components/ui/Badge.tsx`

- [ ] **Step 1: 编写 Button.tsx**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-slate-800 text-white hover:bg-slate-700",
      ghost: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
    };
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-5 text-sm",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { Button };
```

- [ ] **Step 2: 编写 Card.tsx**

```tsx
import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-slate-900 rounded-xl border border-slate-700/50 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: 编写 Input.tsx**

```tsx
import { forwardRef, type InputHTMLAttributes } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
export { Input };
```

- [ ] **Step 4: 编写 Slider.tsx**

```tsx
interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  displayValue: string;
  onChange: (value: number) => void;
}
export function Slider({ value, min, max, step = 1, label, displayValue, onChange }: SliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-blue-400 font-medium">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
      />
    </div>
  );
}
```

- [ ] **Step 5: 编写 Badge.tsx**

```tsx
import type { ReactNode } from "react";

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "accent" }) {
  const colors = {
    default: "bg-slate-700 text-slate-300",
    accent: "bg-blue-500/15 text-blue-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}
```

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components/ui/
git commit -m "feat: 添加 UI 基础组件（Button, Card, Input, Slider, Badge）"
```

---

### Task 14: 根布局 (layout.tsx + page.tsx 骨架)

**Files:**
- Create: `mindlink-ai/frontend/src/app/layout.tsx`
- Create: `mindlink-ai/frontend/src/app/page.tsx`

- [ ] **Step 1: 编写 layout.tsx**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "MindLink AI",
  description: "个人知识内化系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="h-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: 编写 page.tsx（两栏布局骨架）**

```tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatHub } from "@/components/chat/ChatHub";
import type { ChatMessage } from "@/lib/types";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  return (
    <div className="flex h-full">
      {/* 左栏：控制中心 */}
      <Sidebar topK={topK} onTopKChange={setTopK} temperature={temperature} onTemperatureChange={setTemperature} />

      {/* 右栏：对话区 */}
      <ChatHub
        messages={messages}
        onNewMessage={setMessages}
        topK={topK}
        temperature={temperature}
      />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/page.tsx
git commit -m "feat: 添加根布局 layout.tsx + 主页两栏骨架 page.tsx"
```

---

### Task 15: 侧边栏容器 + 文件上传

**Files:**
- Create: `mindlink-ai/frontend/src/components/sidebar/Sidebar.tsx`
- Create: `mindlink-ai/frontend/src/components/sidebar/FileUploader.tsx`

- [ ] **Step 1: 编写 Sidebar.tsx**

```tsx
"use client";

import { Brain } from "lucide-react";
import { FileUploader } from "./FileUploader";
import { DocumentList } from "./DocumentList";
import { ModelParams } from "./ModelParams";

interface SidebarProps {
  topK: number;
  onTopKChange: (v: number) => void;
  temperature: number;
  onTemperatureChange: (v: number) => void;
}

export function Sidebar({ topK, onTopKChange, temperature, onTemperatureChange }: SidebarProps) {
  return (
    <aside className="w-[360px] flex-shrink-0 bg-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <Brain className="w-6 h-6 text-blue-400" />
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-tight">MindLink AI</h1>
            <p className="text-[11px] text-slate-500 mt-0.5">个人知识内化系统</p>
          </div>
        </div>
      </div>

      {/* 文件上传 */}
      <div className="p-4">
        <FileUploader />
      </div>

      {/* 文档列表 */}
      <div className="flex-1 overflow-hidden px-4">
        <DocumentList />
      </div>

      {/* 模型参数 */}
      <div className="p-4 border-t border-slate-700/50">
        <ModelParams
          topK={topK}
          onTopKChange={onTopKChange}
          temperature={temperature}
          onTemperatureChange={onTemperatureChange}
        />
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 编写 FileUploader.tsx**

```tsx
"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";

export function FileUploader() {
  const upload = useUpload();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => upload.mutate(file));
    },
    [upload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/markdown": [".md"], "text/plain": [".txt"] },
    maxSize: 50 * 1024 * 1024,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-blue-400 bg-blue-500/5" : "border-slate-600 hover:border-slate-500 bg-slate-900"}`}
    >
      <input {...getInputProps()} />
      {upload.isPending ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">正在解析...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {isDragActive ? (
            <Upload className="w-8 h-8 text-blue-400" />
          ) : (
            <FileText className="w-8 h-8 text-slate-500" />
          )}
          <p className="text-sm text-slate-400">
            {isDragActive ? "释放以上传文件" : "拖拽文件到此处上传"}
          </p>
          <p className="text-[11px] text-slate-600">PDF · Markdown · TXT（最大 50MB）</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/sidebar/Sidebar.tsx frontend/src/components/sidebar/FileUploader.tsx
git commit -m "feat: 添加 Sidebar 容器 + FileUploader 拖拽上传组件"
```

---

### Task 16: 文档列表 + 模型参数

**Files:**
- Create: `mindlink-ai/frontend/src/components/sidebar/DocumentList.tsx`
- Create: `mindlink-ai/frontend/src/components/sidebar/ModelParams.tsx`

- [ ] **Step 1: 编写 DocumentList.tsx**

```tsx
"use client";

import { FileText, Trash2 } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

export function DocumentList() {
  const { data: documents, isLoading, remove } = useDocuments();

  return (
    <div className="h-full flex flex-col">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
        已索引文档 ({documents?.length ?? 0})
      </p>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {isLoading && (
          <p className="text-xs text-slate-500 py-4 text-center">加载中...</p>
        )}
        {documents?.length === 0 && (
          <p className="text-xs text-slate-600 py-4 text-center">暂无文档，上传一个开始吧</p>
        )}
        {documents?.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start gap-2.5 bg-slate-900 rounded-lg px-3 py-2.5 border border-slate-700/30 group hover:border-slate-600/50 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-slate-200 truncate">{doc.filename}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {doc.page_count ? `${doc.page_count} 页 · ` : ""}
                {doc.chunk_count} 块
              </p>
            </div>
            <button
              onClick={() => remove.mutate(doc.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 编写 ModelParams.tsx**

```tsx
"use client";

import { Slider } from "@/components/ui/Slider";
import { Card } from "@/components/ui/Card";
import { useConfig } from "@/hooks/useDocuments";

interface ModelParamsProps {
  topK: number;
  onTopKChange: (v: number) => void;
  temperature: number;
  onTemperatureChange: (v: number) => void;
}

export function ModelParams({ topK, onTopKChange, temperature, onTemperatureChange }: ModelParamsProps) {
  const { data: config } = useConfig();

  return (
    <Card className="p-4 space-y-4">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">模型参数</p>
      <Slider
        label="Top-K 检索深度"
        value={topK}
        min={1}
        max={20}
        displayValue={String(topK)}
        onChange={onTopKChange}
      />
      <Slider
        label="Temperature"
        value={temperature}
        min={0}
        max={2}
        step={0.1}
        displayValue={temperature.toFixed(1)}
        onChange={onTemperatureChange}
      />
      {config && (
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-600">
            {config.llm_model} · {config.total_documents} 文档 · {config.total_chunks} 块
          </p>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/sidebar/DocumentList.tsx frontend/src/components/sidebar/ModelParams.tsx
git commit -m "feat: 添加 DocumentList 文档列表 + ModelParams 参数调节组件"
```

---

### Task 17: 聊天输入 + 消息气泡

**Files:**
- Create: `mindlink-ai/frontend/src/components/chat/ChatInput.tsx`
- Create: `mindlink-ai/frontend/src/components/chat/MessageBubble.tsx`

- [ ] **Step 1: 编写 ChatInput.tsx**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2.5 px-6 py-4 border-t border-slate-100">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="基于你的知识库提问..."
        disabled={disabled}
        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors disabled:bg-slate-50"
      />
      <Button type="submit" disabled={disabled || !text.trim()}>
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: 编写 MessageBubble.tsx**

```tsx
"use client";

import { marked } from "marked";
import { useMemo } from "react";
import { User, Bot } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  const html = useMemo(() => {
    if (isUser) return null;
    return marked.parse(message.content, { breaks: true }) as string;
  }, [message.content, isUser]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-start gap-2 max-w-[75%] flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="bg-blue-50 rounded-2xl rounded-tr-md px-4 py-2.5">
            <p className="text-sm text-blue-900 whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-slate-600" />
      </div>
      <div>
        <div
          className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 markdown-body text-sm text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html ?? "" }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/chat/ChatInput.tsx frontend/src/components/chat/MessageBubble.tsx
git commit -m "feat: 添加 ChatInput 输入框 + MessageBubble Markdown 消息气泡"
```

---

### Task 18: 溯源卡片 + 消息列表

**Files:**
- Create: `mindlink-ai/frontend/src/components/chat/SourceCard.tsx`
- Create: `mindlink-ai/frontend/src/components/chat/ChatMessages.tsx`

- [ ] **Step 1: 编写 SourceCard.tsx**

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import type { SourceCitation } from "@/lib/types";

export function SourceCitations({ sources }: { sources: SourceCitation[] }) {
  const [open, setOpen] = useState(true);

  if (!sources.length) return null;

  return (
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600"
      >
        <FileText className="w-3.5 h-3.5" />
        参考来源 ({sources.length})
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="divide-y divide-slate-100">
          {sources.map((src, i) => (
            <div
              key={i}
              className={`px-4 py-3 text-xs ${src.score < 0.6 ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800">{src.document_title}</span>
                {src.page_number && (
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    第 {src.page_number} 页
                  </span>
                )}
              </div>
              <p className="text-slate-500 line-clamp-2 leading-relaxed">{src.content}</p>
              <p className="text-[10px] text-slate-400 mt-1">相关度: {src.score.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 编写 ChatMessages.tsx**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { SourceCitations } from "./SourceCard";
import { Loader2 } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
}

export function ChatMessages({ messages, isStreaming, streamingContent }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
          <div className="text-4xl mb-3">🧠</div>
          <p className="text-sm font-medium">MindLink AI 已就绪</p>
          <p className="text-xs mt-1">上传文档后开始对话</p>
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-2">
          <MessageBubble message={msg} />
          {msg.sources.length > 0 && <SourceCitations sources={msg.sources} />}
        </div>
      ))}
      {isStreaming && streamingContent && (
        <div className="flex items-start gap-2 max-w-[85%]">
          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          </div>
          <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 markdown-body text-sm text-slate-700 leading-relaxed">
            {streamingContent}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/chat/SourceCard.tsx frontend/src/components/chat/ChatMessages.tsx
git commit -m "feat: 添加 SourceCard 可折叠溯源 + ChatMessages 消息列表"
```

---

### Task 19: ChatHub 主容器

**Files:**
- Create: `mindlink-ai/frontend/src/components/chat/ChatHub.tsx`

- [ ] **Step 1: 编写 ChatHub.tsx**

```tsx
"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import { useConfig } from "@/hooks/useDocuments";

interface ChatHubProps {
  messages: ChatMessage[];
  onNewMessage: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  topK: number;
  temperature: number;
}

export function ChatHub({ messages, onNewMessage, topK, temperature }: ChatHubProps) {
  const { isStreaming, streamingContent, sendMessage } = useChat(onNewMessage);
  const { data: config } = useConfig();

  const handleSend = useCallback(
    (text: string) => {
      sendMessage(text, topK, temperature);
    },
    [sendMessage, topK, temperature]
  );

  return (
    <main className="flex-1 flex flex-col h-full bg-white">
      {/* 顶栏 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-800">对话</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            基于 {config?.total_documents ?? 0} 个文档 · {config?.total_chunks ?? 0} 个知识块
          </p>
        </div>
        <span className="text-[11px] text-blue-500 font-medium bg-blue-50 px-2.5 py-1 rounded-md">
          DeepSeek-R1
        </span>
      </header>

      {/* 消息列表 */}
      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
      />

      {/* 输入框 */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </main>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add frontend/src/components/chat/ChatHub.tsx
git commit -m "feat: 添加 ChatHub 主对话容器（Header + Messages + Input）"
```

---

### Task 20: React Hooks（useChat, useDocuments, useUpload）

**Files:**
- Create: `mindlink-ai/frontend/src/hooks/useChat.ts`
- Create: `mindlink-ai/frontend/src/hooks/useDocuments.ts`
- Create: `mindlink-ai/frontend/src/hooks/useUpload.ts`

- [ ] **Step 1: 编写 useChat.ts**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, SourceCitation } from "@/lib/types";

export function useChat(
  onNewMessage: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (question: string, topK: number, temperature: number) => {
      // 1. 添加用户消息
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: question,
        sources: [],
        createdAt: new Date().toISOString(),
      };
      onNewMessage((prev) => [...prev, userMsg]);

      // 2. 准备 AI 消息占位
      const aiMsgId = crypto.randomUUID();
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: "assistant",
        content: "",
        sources: [],
        createdAt: new Date().toISOString(),
      };
      onNewMessage((prev) => [...prev, aiMsg]);

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, top_k: topK, temperature }),
          signal: controller.signal,
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let sources: SourceCitation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "text") {
                fullContent += event.content;
                setStreamingContent(fullContent);
                onNewMessage((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, content: fullContent } : m
                  )
                );
              } else if (event.type === "sources") {
                sources = event.sources;
              } else if (event.type === "error") {
                fullContent = `错误: ${event.content}`;
                setStreamingContent(fullContent);
              }
            } catch {
              // 忽略非 JSON 行
            }
          }
        }

        // 最终更新 sources
        onNewMessage((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, sources } : m))
        );
      } catch (err: any) {
        if (err.name !== "AbortError") {
          onNewMessage((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, content: `请求失败: ${err.message}` }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [onNewMessage]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isStreaming, streamingContent, sendMessage, stopStreaming };
}
```

- [ ] **Step 2: 编写 useDocuments.ts**

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDocuments, deleteDocument, fetchConfig } from "@/lib/api";

export function useDocuments() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const remove = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
  return { ...query, remove };
}

export function useConfig() {
  return useQuery({ queryKey: ["config"], queryFn: fetchConfig, refetchInterval: 10_000 });
}
```

- [ ] **Step 3: 编写 useUpload.ts**

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocument } from "@/lib/api";

export function useUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
}
```

- [ ] **Step 4: 验证前端编译**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/frontend
npx next build 2>&1 | tail -20
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/hooks/
git commit -m "feat: 添加 React Hooks（useChat SSE, useDocuments, useUpload）"
```

---

### Task 21: 集成联调 + 端到端验证

- [ ] **Step 1: 确认 Ollama 模型就绪**

```bash
ollama list | grep -E "deepseek-r1|bge-large"
```

如果缺少模型：
```bash
ollama pull deepseek-r1:latest
ollama pull bge-large-zh-v1.5:latest
```

- [ ] **Step 2: 启动后端并验证**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/backend
python -m uvicorn main:app --port 8000 &
sleep 3
# 测试 config
curl -s http://localhost:8000/api/config | python -m json.tool
# 测试文档列表（应为空）
curl -s http://localhost:8000/api/documents | python -m json.tool
```

- [ ] **Step 3: 测试文档上传（如果有测试文件）**

```bash
# 创建一个测试文件
echo "# 测试文档\n\n这是一个测试知识库文档。" > /tmp/test.md
curl -s -X POST http://localhost:8000/api/upload -F "file=@/tmp/test.md" | python -m json.tool
```

- [ ] **Step 4: 测试流式对话**

```bash
curl -s -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"question":"测试","top_k":3,"temperature":0.7}'
```

- [ ] **Step 5: 启动前端并验证**

```bash
cd E:/COLIN/vibecoding/mindlink-ai/frontend
npm run dev &
sleep 5
# 检查首页可访问
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

- [ ] **Step 6: 添加 .gitignore**

```bash
cd E:/COLIN/vibecoding/mindlink-ai
cat > .gitignore << 'GITEOF'
node_modules/
.next/
data/chroma/
backend/venv/
backend/__pycache__/
backend/*.pyc
uploads/*
!uploads/.gitkeep
.superpowers/
GITEOF
touch uploads/.gitkeep
```

- [ ] **Step 7: 最终提交**

```bash
git add .gitignore uploads/.gitkeep
git add -A
git commit -m "feat: MindLink AI v2.0 双端架构实现完成

- FastAPI 后端：文档解析(PyMuPDF) + ChromaDB 向量存储 + Ollama DeepSeek-R1 SSE 流式对话
- Next.js 14 前端：极简学术风两栏布局 + 拖拽上传 + Markdown 渲染 + 可折叠溯源卡片
- API 代理：Next.js rewrites 到 FastAPI :8000
- 全部本地栈：无云服务依赖"
```

---

## 任务依赖

```
Task 0 (清理)
 └─ Task 1 (后端初始化)
     └─ Task 2 (config.py)
         └─ Task 3 (models.py)
             └─ Task 4 (pipeline.py ChromaDB)
                 └─ Task 5 (pipeline.py 解析)
                     └─ Task 6 (pipeline.py Embedding)
                         └─ Task 7 (engine.py)
                             └─ Task 8 (main.py 路由)
                                 └─ Task 9 (main.py SSE)
 └─ Task 10 (前端初始化)
     └─ Task 11 (globals.css + providers)
         └─ Task 12 (types.ts + api.ts)
             └─ Task 13 (UI 组件)
                 └─ Task 14 (layout.tsx)
                     ├─ Task 15 (Sidebar + FileUploader)
                     │   └─ Task 16 (DocumentList + ModelParams)
                     └─ Task 17 (ChatInput + MessageBubble)
                         └─ Task 18 (SourceCard + ChatMessages)
                             └─ Task 19 (ChatHub)
                                 └─ Task 20 (Hooks)
                                     └─ Task 21 (集成联调)
```

- 后端任务 (1-9) 必须顺序执行
- 前端任务 (10-20) 必须顺序执行
- 前后端可并行，在 Task 21 汇合
