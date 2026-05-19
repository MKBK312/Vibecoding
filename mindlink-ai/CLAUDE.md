# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 0. Start Ollama (required for embedding + LLM)
export OLLAMA_MODELS="E:/COLIN/vibecoding/Ollama"
E:/Ollama/ollama.exe serve

# 1. Backend (FastAPI, port 8000)
cd backend
# For Ollama backend (default MVP):
LLM_BACKEND=ollama OLLAMA_BASE_URL=http://localhost:11434 venv/Scripts/python -m uvicorn main:app --reload --port 8000
# For Claude/DeepSeek backend (needs valid ANTHROPIC_AUTH_TOKEN):
ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic ANTHROPIC_MODEL=DeepSeek-V4-Pro[1m] venv/Scripts/python -m uvicorn main:app --reload --port 8000

# 2. Frontend (Next.js, port 3000)
cd frontend && npm run dev
```

No test suite is configured yet.

## Architecture

MindLink AI is a local personal knowledge RAG system — upload PDF/Markdown/TXT files, chat with AI about them, with source citations. **Split architecture: FastAPI backend + Next.js frontend.**

### Data flow

```
Browser file upload → FastAPI /api/upload
  → PyMuPDF (PDF) / plain read (MD, TXT)
  → chunker (400 chars/chunk, 60 char overlap)
  → bge-large-zh-v1.5 embedding (Ollama, via llama-index)
  → ChromaDB (local, ./data/chroma/)
  → User question → embed → ChromaDB Top-K cosine search
  → LLM (Ollama qwen2.5:3b or Claude API → DeepSeek, streaming SSE)
  → answer with [file:page] citations
```

### LLM Backend

- **Default (MVP)**: Ollama local `qwen2.5:3b` (1.9GB, good instruction-following)
- **Optional**: Claude-compatible API (DeepSeek) via `ANTHROPIC_BASE_URL`
- **Switch**: Set env `LLM_BACKEND=ollama` or `LLM_BACKEND=claude`
- Claude API requires valid `ANTHROPIC_AUTH_TOKEN` (currently needs new key)

### Key directories

```
backend/
├── main.py            # FastAPI app (upload, documents, config, chat/stream)
├── models.py          # Pydantic models (ChatRequest, DocumentInfo, ConfigResponse)
├── config.py          # Constants (ChromaDB path, models, chunk params, API keys)
├── pipeline.py        # Document indexing (parse → chunk → embed → store)
├── engine.py          # RAG chat (embed query → search → prompt → SSE stream)
└── requirements.txt   # Python dependencies

frontend/
├── next.config.js     # Rewrites /api/* → localhost:8000
└── src/
    ├── app/
    │   ├── page.tsx        # Main SPA (sidebar + chat area)
    │   ├── layout.tsx      # Root layout (zh-CN)
    │   └── globals.css     # Tailwind + markdown styles
    └── lib/
        ├── types.ts        # TypeScript interfaces (ConfigResponse has llm_backend)
        └── api.ts          # API client (fetch wrapper)
```

### Data model

- **Document metadata**: JSON file at `data/chroma/doc_meta.json` (doc_id → filename, source_type, page_count, chunk_count, created_at)
- **Vector chunks**: ChromaDB collection `mindlink_docs` with cosine distance, metadata includes `document_id`, `filename`, `page_number`, `chunk_index`

### Frontend → Backend communication

Next.js `rewrites()` in `next.config.js` proxies all `/api/*` requests to `http://localhost:8000/api/*`. The frontend fetches `/api/documents`, `/api/upload`, `/api/chat/stream` etc. without absolute URLs.

## Important implementation details

- **Two servers required**: Backend (uvicorn, port 8000) and frontend (next dev, port 3000) must both be running.
- **Ollama required**: Embedding `modelscope.cn/Embedding-GGUF/bge-large-zh-v1.5:latest` + LLM `qwen2.5:3b`. Pull with `ollama pull <model>`.
- **Ollama models path**: `E:/COLIN/vibecoding/Ollama/`. Set `OLLAMA_MODELS` env before starting Ollama.
- **Python venv**: Located at `backend/venv/`. Use `venv/Scripts/python` directly (Windows).
- **ChromaDB**: Persistent storage at `../data/chroma/` (relative to backend/). Auto-created on first run.
- **PDF parsing**: Uses PyMuPDF (fitz). Text-based PDFs only; scanned/image PDFs will fail.
- **Embedding**: Manual `embed_model.get_text_embedding()` called explicitly (not OllamaEmbeddingFunction auto-embed).
- **Streaming**: SSE events have types: `text` (content delta), `sources` (citations), `done` (end), `error` (failure). Each line: `data: {"type":"...","content":"...","sources":[...]}\n\n`.
- **ConfigResponse** includes `llm_backend` field — frontend dynamically renders model name from config.
- **System prompt** (engine.py `_build_system_prompt`): tells model to ignore irrelevant chunks and only answer with directly relevant info.

## Design documents

The full system design doc (in Chinese) is at `E:\COLIN\vibecoding\开发文档\个人话知识系统设计文档.md`.
