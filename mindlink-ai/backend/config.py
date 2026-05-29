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
LLM_MODEL = "qwen2.5:3b"
EMBEDDING_MODEL = "modelscope.cn/Embedding-GGUF/bge-large-zh-v1.5:latest"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# --- Claude API ---
LLM_BACKEND = os.getenv("LLM_BACKEND", "claude")  # "claude" 或 "ollama"
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_AUTH_TOKEN", os.getenv("ANTHROPIC_API_KEY", ""))
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# --- 分块参数 ---
CHUNK_SIZE = 400        # 每个 chunk 的字符数（bge-large-zh 上下文限制 512 tokens，中文约 1 char/token，留余量）
CHUNK_OVERLAP = 60      # chunk 之间重叠的字符数

# --- 检索默认值 ---
DEFAULT_TOP_K = 5
DEFAULT_TEMPERATURE = 0.7
MIN_SIMILARITY_SCORE = 0.40  # 所有 chunk 分数低于此值时，拒绝回答（避免 LLM 瞎编）

# --- 支持的文件类型 ---
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}
