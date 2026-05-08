# MindLink AI 重设计文档 v2.0

**日期：** 2026-05-08
**状态：** 已确认
**说明：** 将现有 Next.js 全栈架构重构为 FastAPI (Python) + Next.js 14 (前端) 双端架构，切换到本地 Ollama 模型栈。

---

## 一、技术决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 后端框架 | FastAPI (Python 3.10+) | 异步原生支持，SSE 流式友好，LlamaIndex 原生 Python 生态 |
| 前端框架 | Next.js 14 App Router | React Server Components，文件路由约定 |
| LLM | DeepSeek-R1 (Ollama) | 中文理解强，推理链清晰，适合学术文献分析 |
| Embedding | bge-large-zh-v1.5 (Ollama) | BAAI 中文 Embedding SOTA，Ollama 可直接拉取 |
| 向量库 | ChromaDB | 本地轻量，无外部依赖，LlamaIndex 内置集成 |
| PDF 解析 | PyMuPDF (fitz) | 逐页提取，天然带页码信息 |
| RAG 策略 | 手动解析 + LlamaIndex 查询引擎 | 页码/元数据完全受控，检索保留高级接口 |
| 前端组件 | 全部重写 | 与旧 Next.js 全栈代码无耦合 |
| 样式方案 | Tailwind CSS + Shadcn UI | 极简学术风 |
| 图标 | Lucide React | 统一图标集 |

---

## 二、系统架构

```
浏览器 (localhost:3000)
    │
    ├── 静态资源 ← Next.js 14 前端
    │       ├── layout.tsx      两栏响应式布局
    │       ├── Sidebar.tsx     控制中心
    │       └── ChatHub.tsx     主交互区
    │
    └── API 请求 → FastAPI 后端 (localhost:8000)
                      │
                      ├── POST /api/upload     文档上传 + 解析入库
                      ├── GET  /api/documents   已索引文档列表
                      ├── DELETE /api/documents/{id}  删除文档
                      ├── POST /api/chat/stream SSE 流式对话
                      └── GET  /api/config     系统配置
                      │
                      ├── LlamaIndex (查询引擎)
                      ├── ChromaDB (向量存储)
                      ├── Ollama API (DeepSeek-R1 + bge-large-zh-v1.5)
                      └── PyMuPDF (PDF 解析)
```

### 数据流

**文档上传链路：**
```
文件上传 → FastAPI 接收
  → PyMuPDF 逐页解析（保留页码）
  → RecursiveCharacterTextSplitter 分块 (chunk=600, overlap=100)
  → OllamaEmbedding(bge-large-zh-v1.5) 向量化
  → ChromaDB 持久化（元数据: filename, page_number, chunk_index, source_type）
```

**知识对话链路：**
```
用户提问 → Next.js EventSource → FastAPI /chat/stream (SSE)
  → OllamaEmbedding 向量化问题
  → ChromaDB Top-K 相似度检索
  → 构造 Prompt（注入引用元数据）
  → Ollama(DeepSeek-R1) 流式生成
  → SSE 推送: {type: "text"/"sources"/"done", content, sources: [...]}
  → Next.js 实时渲染 Markdown + 来源卡片
```

---

## 三、后端设计

### 目录结构

```
backend/
├── main.py              # FastAPI 入口，路由注册，CORS
├── engine.py            # LlamaIndex 查询引擎（检索 + 生成）
├── pipeline.py          # 文档处理管线（解析 + 分块 + 入库）
├── models.py            # Pydantic 数据模型
├── config.py            # 配置管理（Top-K, Temperature 等）
└── requirements.txt     # Python 依赖
```

### API 端点

| 方法 | 路径 | 请求 | 响应 | 说明 |
|------|------|------|------|------|
| `POST` | `/api/upload` | FormData (file) | `{id, filename, page_count, chunk_count}` | 上传文档，触发解析入库 |
| `GET` | `/api/documents` | — | `[{id, filename, chunk_count, page_count, created_at}]` | 已索引文档列表 |
| `DELETE` | `/api/documents/{id}` | — | `{success: bool}` | 删除文档及向量 |
| `POST` | `/api/chat/stream` | `{question, top_k, temperature}` | SSE 流 | 流式对话 |
| `GET` | `/api/config` | — | `{top_k, temperature, llm_model, embedding_model}` | 获取配置 |

### engine.py 查询流程

1. 接收 `question`, `top_k`, `temperature`
2. `OllamaEmbedding(model="bge-large-zh-v1.5")` 向量化问题
3. `ChromaDB.similarity_search(embedding, k=top_k)` 检索
4. 提取元数据：`{filename, page_number, chunk_text, score}`
5. 构造 Prompt 模板：

```
你是一个学术研究助手。请基于以下参考资料回答问题，引用来源时使用 [文件名:页码] 格式。

参考资料：
[1] 《认知心理学导论.pdf》第 12 页: "...认知负荷理论假设人类的认知架构由工作记忆和长时记忆组成..."
[2] 《认知心理学导论.pdf》第 15 页: "...Sweller 提出了多种降低外在认知负荷的策略..."

问题：什么是认知负荷理论？

回答要求：
- 基于参考资料，不编造
- 引用时标注 [文件名:页码]
- 如果参考资料不足以回答问题，请明确指出
```

6. `Ollama(model="deepseek-r1:latest", temperature=T)` 流式生成
7. 每生成一段，包装为 SSE event: `{type: "text", content: "..."}`
8. 生成完毕，发送 sources: `{type: "sources", sources: [...]}`
9. 流结束: `{type: "done"}`

### PDF 页码处理（方案 B 核心）

使用 PyMuPDF 逐页提取，页码天然保留：

```python
import fitz  # PyMuPDF

doc = fitz.open(file_path)
for page_num in range(len(doc)):
    text = doc[page_num].get_text()
    chunks = text_splitter.split_text(text)
    for ci, chunk in enumerate(chunks):
        metadata = {
            "filename": file_name,
            "page_number": page_num + 1,   # 1-indexed
            "chunk_index": ci,
            "source_type": "pdf"
        }
        # → embedding → chromadb.insert(metadata=metadata)
```

### models.py

```python
from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    question: str
    top_k: int = 5
    temperature: float = 0.7

class SourceCitation(BaseModel):
    document_id: str
    document_title: str
    page_number: Optional[int] = None
    content: str
    score: float

class DocumentInfo(BaseModel):
    id: str
    filename: str
    source_type: str        # "pdf" | "markdown" | "word"
    page_count: Optional[int] = None
    chunk_count: int
    created_at: str

class ConfigResponse(BaseModel):
    top_k: int
    temperature: float
    llm_model: str
    embedding_model: str
    total_documents: int
    total_chunks: int
```

---

## 四、前端设计

### 目录结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 根布局（两栏）
│   │   ├── page.tsx             # 主页入口
│   │   ├── globals.css          # Tailwind + 自定义主题
│   │   └── providers.tsx        # QueryClient + Theme
│   ├── components/
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx      # 控制中心容器
│   │   │   ├── FileUploader.tsx # 拖拽上传组件
│   │   │   ├── DocumentList.tsx # 已索引文档列表
│   │   │   └── ModelParams.tsx  # Top-K / Temperature 滑块
│   │   ├── chat/
│   │   │   ├── ChatHub.tsx      # 主交互区容器
│   │   │   ├── ChatMessages.tsx # 消息列表（含自动滚动）
│   │   │   ├── MessageBubble.tsx# 单条消息气泡
│   │   │   ├── SourceCard.tsx   # 可折叠溯源卡片
│   │   │   └── ChatInput.tsx    # 输入框 + 发送按钮
│   │   └── ui/                  # Shadcn UI 基础组件
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Slider.tsx
│   │       └── Badge.tsx
│   ├── lib/
│   │   ├── api.ts               # API 调用封装（fetch + EventSource）
│   │   └── types.ts             # TypeScript 类型定义
│   └── hooks/
│       ├── useChat.ts           # 聊天状态管理 + SSE 解析
│       ├── useDocuments.ts      # 文档列表查询
│       └── useUpload.ts         # 文件上传状态
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

### 组件树

```
layout.tsx
├── Sidebar.tsx （左栏，360px 固定宽）
│   ├── Logo + 项目名
│   ├── FileUploader.tsx     — react-dropzone 拖拽区
│   ├── DocumentList.tsx     — 滚动列表（已索引文件）
│   └── ModelParams.tsx      — Top-K/Temp 滑条
└── ChatHub.tsx （右栏，flex-1）
    ├── Header（知识库状态 + 当前模型名）
    ├── ChatMessages.tsx      — 消息列表（overflow-auto）
    │   ├── MessageBubble.tsx — 用户/AI 气泡
    │   └── SourceCard.tsx    — 可折叠来源卡片
    └── ChatInput.tsx         — 输入框 + 发送按钮
```

### 响应式布局

- **≥1024px**：左右两栏并排
- **768-1024px**：左栏折叠为顶部工具栏（可展开）
- **<768px**：左栏隐藏，通过汉堡菜单呼出抽屉

### 视觉规范

| 元素 | 颜色 | Tailwind Class |
|------|------|---------------|
| 侧边栏背景 | #1e293b (slate-800) | `bg-slate-800` |
| 侧边栏卡片 | #0f172a (slate-900) | `bg-slate-900` |
| 对话区背景 | #ffffff | `bg-white` |
| 消息气泡 (用户) | #eff6ff (blue-50) | `bg-blue-50` |
| 消息气泡 (AI) | #f8fafc (slate-50) | `bg-slate-50` |
| 强调色 | #3b82f6 (blue-500) | `text-blue-500` |
| 正文 | #334155 (slate-700) | `text-slate-700` |
| 辅助文字 | #94a3b8 (slate-400) | `text-slate-400` |
| 字体 | Inter | Tailwind 默认 |
| 图标 | Lucide React | — |

### SSE 流式处理

```typescript
// hooks/useChat.ts — POST + ReadableStream 流式读取
const response = await fetch(`${API_BASE}/api/chat/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, top_k, temperature })
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // 按行解析 SSE: data: {"type":"text"/"sources"/"done", "content":"...", "sources":[...]}
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'text') appendToMessage(event.content);
      if (event.type === 'sources') setSources(event.sources);
      if (event.type === 'done') finalizeMessage();
    }
  }
}
```

### 溯源卡片交互

- 每个 AI 回答下方默认显示可折叠的"参考来源"组件
- 点击来源卡片 → 高亮显示该引用对应的文档名和页码
- 卡片内展示：文件名、页码、匹配文本片段、相关度评分
- 相关度 <0.6 的来源用半透明样式以示区分

---

## 五、环境配置

### Ollama 模型拉取

```bash
ollama pull deepseek-r1:latest
ollama pull bge-large-zh-v1.5:latest
```

### Python 环境 (backend/requirements.txt)

```
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

### 启动方式

```bash
# 终端 1：启动 FastAPI 后端
cd backend
uvicorn main:app --reload --port 8000

# 终端 2：启动 Next.js 前端
cd frontend
npm run dev
```

---

## 六、与旧项目的差异

| 维度 | 旧项目 (mindlink-ai/) | 新设计 |
|------|----------------------|--------|
| 架构 | Next.js 全栈单体 | FastAPI + Next.js 前后端分离 |
| Embedding | @xenova/transformers (Node.js) | Ollama bge-large-zh-v1.5 (Python) |
| LLM | Claude API (云端) | DeepSeek-R1 (本地 Ollama) |
| RAG 框架 | 手工实现 | LlamaIndex |
| PDF 解析 | pdf.js (CDN) | PyMuPDF (本地) |
| 前端组件 | 现有 20+ 组件 | 全部重写 |
| API 密钥 | localStorage / 环境变量 | 无密钥依赖（纯本地） |

---

## 七、实施策略

1. **后端先行**：先搭建 FastAPI + LlamaIndex + Ollama 核心链路，验证 `curl` 测试通过
2. **前端跟上**：从空白 Next.js 项目开始，逐步实现布局 → 文档管理 → 对话功能
3. **联调对接**：前端的 `localhost:3000` 配置 API proxy 到 `localhost:8000`
4. **旧代码处理**：新的 `mindlink-ai/backend/` 和 `mindlink-ai/frontend/` 将替换现有代码
