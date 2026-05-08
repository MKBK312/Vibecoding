# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured yet.

## Architecture

MindLink AI is a local personal knowledge RAG system — upload PDF/Markdown files, chat with AI about them, with source citations. Built as a **Next.js 14 App Router** full-stack monolith.

### Data flow

```
Browser file upload → PDF.js (client) / Markdown parse (server)
  → chunker (500-800 chars/chunk)
  → bge-small-zh embedding (@xenova/transformers, server-side)
  → ChromaDB (local, ./data/chroma/)
  → User question → embed → ChromaDB Top-K search
  → Claude API (streaming SSE) → answer with [file:page] citations
```

### Key directories

```
src/
├── app/api/           # API Routes
│   ├── documents/     # Upload (POST), list (GET)
│   ├── documents/[id]/# Get single doc (GET), delete (DELETE)
│   ├── search/        # Vector search (POST)
│   ├── chat/stream/   # Streaming chat + Claude (POST, SSE)
│   ├── summary/[id]/  # Generate structured summary (POST)
│   └── config/        # System config (GET)
├── lib/
│   ├── types.ts       # All TypeScript interfaces
│   ├── constants.ts   # Magic values (Top-K range, chunk sizes, API routes)
│   ├── db/chroma.ts   # ChromaClient singleton + getOrCreateCollection
│   ├── db/collections.ts  # CRUD for documents & chunks collections
│   ├── embedding/encoder.ts  # bge-small-zh via @xenova/transformers pipeline
│   ├── embedding/search.ts   # semanticSearch() — embed query → ChromaDB query
│   └── parser/        # pdf.ts (pdf.js), markdown.ts (marked), chunker.ts
└── components/
    ├── chat/          # ChatArea, ChatInput, MessageBubble, SourceCitations
    ├── documents/     # FileUploader, DocumentList, DocumentCard, StatsPanel
    ├── layout/        # Sidebar, SettingsModal
    └── ui/            # Button, Card, Input, Modal, Select (all forwardRef)
```

### Data model (ChromaDB)

Two collections: **`documents`** (metadata as JSON strings) and **`chunks`** (text content with `document_id`, `page_number`, `chunk_index` in metadata). Search results join back to documents by `document_id` to get titles.

### Path alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Important implementation details

- **ChromaDB compatibility**: `next.config.js` aliases `canvas` and `encoding` to `false` in webpack. Do not remove these — ChromaDB's Node client references them unnecessarily.
- **PDF worker**: pdf.js worker is loaded from CDN (`cdnjs.cloudflare.com`), not a local copy. This means PDF parsing requires network access.
- **API key storage**: The Anthropic API key is stored in `localStorage` (client-side), set via SettingsModal. The streaming chat route (`chat/stream/route.ts`) tries to read it via `getApiKey()` which calls `localStorage.getItem()` — this will always return empty string server-side. The actual API key must be set via `ANTHROPIC_API_KEY` environment variable for server-side use.
- **No .gitignore**: There is no `.gitignore` file — `node_modules/`, `.next/`, and `data/chroma/` are not excluded. This is a known issue.
- **Top-K is not wired through**: The Sidebar has a Top-K selector, but `ChatArea` does not pass it to `/api/chat/stream`. The stream route uses `DEFAULT_TOP_K` (5) regardless of user selection.

## Design documents

The full system design doc (in Chinese) is at `E:\COLIN\vibecoding\开发文档\个人话知识系统设计文档.md`.
