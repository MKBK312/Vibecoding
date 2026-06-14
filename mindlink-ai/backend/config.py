"""
MindLink AI 配置常量
"""

import os
import json

# --- ChromaDB ---
CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "chroma"
)
DEFAULT_COLLECTION_NAME = "mindlink_docs"


def _get_kb_config_path(user_id: str | None = None) -> str:
    """知识库配置文件路径（按用户隔离）"""
    if user_id:
        return os.path.join(CHROMA_PERSIST_DIR, f"kb_config_{user_id}.json")
    return os.path.join(CHROMA_PERSIST_DIR, "kb_config.json")


def _load_kb_config(user_id: str | None = None) -> dict:
    """加载知识库配置"""
    path = _get_kb_config_path(user_id)
    if not os.path.exists(path):
        return {"active_collection": DEFAULT_COLLECTION_NAME, "collections": [DEFAULT_COLLECTION_NAME]}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"active_collection": DEFAULT_COLLECTION_NAME, "collections": [DEFAULT_COLLECTION_NAME]}


def _save_kb_config(config: dict, user_id: str | None = None) -> None:
    """保存知识库配置"""
    path = _get_kb_config_path(user_id)
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_active_collection(user_id: str | None = None) -> str:
    """获取当前激活的知识库名称"""
    return _load_kb_config(user_id).get("active_collection", DEFAULT_COLLECTION_NAME)


def set_active_collection(name: str, user_id: str | None = None) -> None:
    """切换激活的知识库"""
    config = _load_kb_config(user_id)
    config["active_collection"] = name
    if name not in config["collections"]:
        config["collections"].append(name)
    _save_kb_config(config, user_id)


def list_kb_collections(user_id: str | None = None) -> list:
    """列出所有知识库名称"""
    return _load_kb_config(user_id).get("collections", [DEFAULT_COLLECTION_NAME])


def add_kb_collection(name: str, user_id: str | None = None) -> None:
    """添加新知识库"""
    config = _load_kb_config(user_id)
    if name not in config["collections"]:
        config["collections"].append(name)
    _save_kb_config(config, user_id)


# --- Ollama 模型 ---
LLM_MODEL = "qwen2.5:3b"
EMBEDDING_MODEL = "modelscope.cn/Embedding-GGUF/bge-large-zh-v1.5:latest"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

# --- Claude API ---
LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_AUTH_TOKEN", os.getenv("ANTHROPIC_API_KEY", ""))
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

# --- 分块参数 ---
CHUNK_SIZE = 384
CHUNK_OVERLAP = 50

# --- 检索默认值 ---
DEFAULT_TOP_K = 5
DEFAULT_TEMPERATURE = 0.7
MIN_SIMILARITY_SCORE = 0.40

# --- Reranker 精排 ---
RERANK_CANDIDATE_K = 20  # 粗召回候选数，重排后取 top_k 个
BM25_CANDIDATE_K = 20    # BM25 关键词检索候选数
RERANK_MAX_PAIRS = 8     # Reranker 最大候选对数（CPU 模式下限制耗时，~5s）

# --- 支持的文件类型 ---
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt", ".docx"}
