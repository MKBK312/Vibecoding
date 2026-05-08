"""
MindLink AI FastAPI 后端入口

提供以下 API：
  - POST /api/upload        上传文档（解析 + 向量化 + 入库）
  - GET  /api/documents      已索引文档列表
  - DELETE /api/documents/{id}  删除文档及其向量
  - GET  /api/config         系统配置与统计
  - POST /api/chat/stream    SSE 流式对话
"""

import os
import hashlib
from typing import List

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import (
    ChatRequest,
    UploadResponse,
    DeleteResponse,
    ConfigResponse,
    DocumentInfo,
)
from config import (
    ALLOWED_EXTENSIONS,
    DEFAULT_TOP_K,
    DEFAULT_TEMPERATURE,
    LLM_MODEL,
    EMBEDDING_MODEL,
)
from pipeline import index_document, get_all_documents, delete_document
from engine import stream_chat

# ---------------------------------------------------------------------------
# FastAPI 应用初始化
# ---------------------------------------------------------------------------

app = FastAPI(title="MindLink AI", version="2.0.0")

# CORS：允许 Next.js 前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 上传文件存放目录（相对于 backend/ 的 ../uploads/）
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# 辅助函数
# ---------------------------------------------------------------------------

def _get_source_type(filename: str) -> str:
    """根据文件扩展名判断文档类型"""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型: {ext}，允许的类型: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    # 扩展名 -> source_type 映射
    type_map = {
        ".pdf": "pdf",
        ".md": "markdown",
        ".txt": "txt",
    }
    return type_map[ext]


# ---------------------------------------------------------------------------
# API 端点
# ---------------------------------------------------------------------------


@app.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """上传文档 -> 解析 -> 向量化 -> 入库"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名为空")

    source_type = _get_source_type(file.filename)

    # 生成唯一文件名，防止覆盖
    name_part, ext_part = os.path.splitext(file.filename)
    file_hash = hashlib.md5(file.filename.encode()).hexdigest()[:8]
    safe_name = f"{name_part}_{file_hash}{ext_part}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    # 保存上传文件到本地
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 调用管线处理
    try:
        doc_id, chunk_count, page_count = index_document(
            file_path, file.filename, source_type
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文档处理失败: {str(e)}")

    return UploadResponse(
        id=doc_id,
        filename=file.filename,
        page_count=page_count,
        chunk_count=chunk_count,
        message=f"成功索引 {chunk_count} 个文本块",
    )


@app.get("/api/documents", response_model=List[DocumentInfo])
async def list_documents():
    """获取所有已索引文档"""
    return get_all_documents()


@app.delete("/api/documents/{doc_id}", response_model=DeleteResponse)
async def remove_document(doc_id: str):
    """删除文档及其所有向量 chunk"""
    deleted_chunks = delete_document(doc_id)
    return DeleteResponse(success=True, deleted_chunks=deleted_chunks)


@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    """获取系统配置与当前知识库统计"""
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


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """SSE 流式对话端点"""

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
            "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
        },
    )
