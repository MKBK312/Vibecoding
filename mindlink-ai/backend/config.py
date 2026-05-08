"""
MindLink AI 配置常量
"""

import os

# --- ChromaDB ---
# 向量数据持久化目录（相对于 backend/ 的 ../data/chroma/）
CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "chroma"
)
CHROMA_COLLECTION_NAME = "mindlink_docs"

# --- Ollama 模型 ---
LLM_MODEL = "deepseek-r1:latest"
EMBEDDING_MODEL = "bge-large-zh-v1.5:latest"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# --- 分块参数 ---
CHUNK_SIZE = 600        # 每个 chunk 的字符数
CHUNK_OVERLAP = 100     # chunk 之间重叠的字符数

# --- 检索默认值 ---
DEFAULT_TOP_K = 5
DEFAULT_TEMPERATURE = 0.7

# --- 支持的文件类型 ---
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}
