"""
Pydantic 数据模型
"""

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
    llm_backend: str       # "claude" or "ollama"
    llm_model: str
    embedding_model: str
    total_documents: int
    total_chunks: int
