"""
MindLink AI 配置常量
"""

import os
import json

# --- ChromaDB ---
# 向量数据持久化目录（相对于 backend/ 的 ../data/chroma/）
CHROMA_PERSIST_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "data", "chroma"
)
DEFAULT_COLLECTION_NAME = "mindlink_docs"

# 知识库配置文件
_KB_CONFIG_FILE = os.path.join(CHROMA_PERSIST_DIR, "kb_config.json")


def _load_kb_config() -> dict:
    """加载知识库配置"""
    if not os.path.exists(_KB_CONFIG_FILE):
        return {"active_collection": DEFAULT_COLLECTION_NAME, "collections": [DEFAULT_COLLECTION_NAME]}
    try:
        with open(_KB_CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {"active_collection": DEFAULT_COLLECTION_NAME, "collections": [DEFAULT_COLLECTION_NAME]}


def _save_kb_config(config: dict) -> None:
    """保存知识库配置"""
    os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
    with open(_KB_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)


def get_active_collection() -> str:
    """获取当前激活的知识库名称"""
    return _load_kb_config().get("active_collection", DEFAULT_COLLECTION_NAME)


def set_active_collection(name: str) -> None:
    """切换激活的知识库"""
    config = _load_kb_config()
    config["active_collection"] = name
    if name not in config["collections"]:
        config["collections"].append(name)
    _save_kb_config(config)


def list_kb_collections() -> list:
    """列出所有知识库名称"""
    return _load_kb_config().get("collections", [DEFAULT_COLLECTION_NAME])


def add_kb_collection(name: str) -> None:
    """添加新知识库"""
    config = _load_kb_config()
    if name not in config["collections"]:
        config["collections"].append(name)
    _save_kb_config(config)

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
# SentenceSplitter 语义分块：优先在段落/句子边界切分，再按 token 数控制块大小
CHUNK_SIZE = 384         # tokens（bge-large-zh 上下文 512 tokens，留余量给 metadata）
CHUNK_OVERLAP = 50       # tokens

# --- 检索默认值 ---
DEFAULT_TOP_K = 5
DEFAULT_TEMPERATURE = 0.7
MIN_SIMILARITY_SCORE = 0.40  # 所有 chunk 分数低于此值时，拒绝回答（避免 LLM 瞎编）

# --- 支持的文件类型 ---
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt", ".docx"}
