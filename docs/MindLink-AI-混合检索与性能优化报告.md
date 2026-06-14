# MindLink AI 混合检索 + 渲染 + 性能优化 设计报告

**日期**：2026-06-13
**版本**：v1.0
**状态**：已完成

---

## 一、背景

当前检索仅为向量余弦相似度，对关键词精确匹配弱。Markdown 渲染缺少 CSS，表格/代码块不可读。首次请求延迟 ~37s，用户体验差。

## 二、目标

1. BM25 + 向量混合检索，提升关键词召回覆盖
2. Markdown CSS 补全，提升回答可读性
3. 端到端延迟从 37s 降至可接受范围

---

## 三、功能一：BM25 + 向量混合检索

### 3.1 方案

用户选定 **先并后排（方案 A）**：BM25 和向量各自独立召回，合并去重后一起进 Reranker 精排。

```
Query ─┬→ Embedding → ChromaDB 向量召回 20 候选项
       │
       └→ BM25 (内存索引) 召回 20 候选项
       │
       └→ 按 content 去重合并
       │
       └→ 阈值门（仅向量候选需过余弦阈值，BM25 绕过）
       │
       └→ CrossEncoder Reranker 精排 → Top-5
       │
       └→ 相邻块扩展 → 最多 10 个 chunk
```

### 3.2 改动

| 文件 | 改动 |
|------|------|
| `requirements.txt` | `rank-bm25>=0.2` |
| `config.py` | `BM25_CANDIDATE_K = 20` |
| `engine.py` | `_tokenize()` 中英分词 + `search_chunks()` BM25 并行召回 |

### 3.3 难点：中文分词

`rank-bm25` 默认按空格切词，不适用于中文。方案：字符级 bigram 分词。

```python
def _tokenize(text: str) -> List[str]:
    # CJK 字符按单字切分，英文按空格切词
    # 追加相邻 bigram 捕捉双字词组
    # "你好world" → ["你","好","world","你好","好world"]
```

### 3.4 难点：去重合并

BM25 和向量结果可能重叠，按 `content`（chunk 文本）去重。BM25 候选项额外扩展 `_ci`（chunk_index）列表，保证相邻块扩展阶段索引对应正确。

### 3.5 难点：阈值语义

余弦相似度阈值 `MIN_SIMILARITY_SCORE=0.40` 仅对向量候选项生效，BM25 候选项关键词已命中直接通过。BM25 分数与余弦相似度量纲不同（上限不定），不设独立阈值。

### 3.6 验证方式

SSE sources 事件嵌入 `retrieval_stats` 字段：
```json
"retrieval_stats": {"vec": 20, "bm25": 20, "merged": 40}
```

---

## 四、功能二：Markdown CSS 补全

### 4.1 发现

项目已使用 `marked` 渲染 Markdown → HTML，但 `globals.css` 仅覆盖 4 个元素（p/ul/strong/inline code）。表格、代码块、标题等以纯文本外观显示。

### 4.2 改动

| 文件 | 改动 |
|------|------|
| `globals.css` | `.markdown-body` 区域追加 13 个元素样式 |

新增元素：ol, li, em, pre, pre code, h1-h6, blockquote, a, a:hover, hr, table, th, td, tbody tr:nth-child(even)

### 4.3 设计原则

- 色系沿用 slate/slate-700 调子，与现有 Tailwind 主题一致
- 代码块深色背景 `#1e293b` + 白色等宽字体
- 表格斑马纹 + 边框合并
- blockquote 左边框 `#cbd5e1` + 浅灰背景

---

## 五、功能三：性能优化

### 5.1 问题定位（37s → 13s）

逐环节 profiling 发现三个瓶颈：

#### 难点 1：Python 解析 `localhost` DNS 巨慢

**现象**：Ollama embedding API 调用在 `curl` 中 0.33s，Python `requests` 中 2.1s。

**根因**：Windows 上 Python 解析 `localhost` 走 IPv6 `::1` → 超时 → 回退 IPv4 `127.0.0.1`，每次新连接都重复此流程。

**修复**：

| 文件 | 改动 |
|------|------|
| `config.py` | `OLLAMA_BASE_URL` 默认值 `localhost` → `127.0.0.1` |
| `pipeline.py` | `requests` → `httpx.Client` 单例复用（keep-alive） |

**效果**：0.07s（35x 提升）

#### 难点 2：Reranker CPU 推理 42s

**现象**：`search_chunks()` 内 40 对 query-chunk 送入 CrossEncoder 精排，耗时 42s（~1s/对）。

**根因**：`bge-reranker-v2-m3` 模型（~2.2GB）在 CPU 上推理，每对 ~0.7s。PyTorch 为 CPU-only 版本，无法使用 CUDA。

**尝试过的方案**：
- `device="cuda"` → 失败，PyTorch 未编译 CUDA
- `pip install torch --index-url cu121` → 下载超时（网络不可达）
- `torch.set_num_threads(8)` → 有限改善
- `model_kwargs={"torchscript": False}` → 参数无效，Reranker 加载崩溃

**最终方案**：三重修复

| 文件 | 改动 |
|------|------|
| `config.py` | `RERANK_MAX_PAIRS = 8`（候选池上限） |
| `engine.py` | `torch.set_num_threads(8)` + `search_chunks()` 内候选截断逻辑 |
| `main.py` | `startup()` 预热推理：消除首次调用冷启动 |

**效果**：42s → ~6s（7x 提升）

#### 难点 3：BM25 索引每次重建

**现象**：每个请求都执行 `collection.get()` 拉全库 chunk → tokenize → `BM25Okapi()` 建索引。

**修复**：模块级缓存在 `_get_bm25_index()` 中，用 `collection.count()` 检测文档变动。

**Bug**：初版在缓存命中前仍调用 `collection.get()`，缓存形同虚设。修正为先 `count()` 判断再决定是否 `get()`。

| 文件 | 改动 |
|------|------|
| `engine.py` | `_get_bm25_index()` 缓存函数 + `_bm25_cache` 全局变量 |

---

## 六、其他发现与修复

### 6.1 HuggingFace 不可达

HF 在用户网络环境连接超时。设置 `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1` 使用本地缓存，避免下载。

### 6.2 Reranker 启动容错

`engine.py` `_get_reranker()` 和 `main.py` `startup()` 均包裹 `try/except`，HF 不可达时优雅降级到纯向量检索。

### 6.3 config 端点修正

`/api/config` 的 `llm_model` 字段始终返回 `LLM_MODEL`（`qwen2.5:3b`），Claude 模式下错误。修正为根据 `LLM_BACKEND` 动态返回。

### 6.4 Windows 进程管理

`pkill -f "uvicorn"` 在 Windows bash 中不可靠，需用 `taskkill //PID`。旧进程残留导致端口占用，新启动失败。

---

## 七、改动文件汇总

| 文件 | 改动类型 |
|------|----------|
| `backend/requirements.txt` | `rank-bm25>=0.2` |
| `backend/config.py` | `BM25_CANDIDATE_K`, `RERANK_MAX_PAIRS`, `OLLAMA_BASE_URL` 默认值 |
| `backend/engine.py` | `_tokenize()`, `_get_bm25_index()`, `search_chunks()` BM25+截断+降级, `torch` 多线程, `retrieval_stats` |
| `backend/pipeline.py` | `httpx.Client` 单例替代 `requests` |
| `backend/main.py` | `startup()` Reranker 预热+try/except, config `llm_model` 修正 |
| `frontend/src/app/globals.css` | `.markdown-body` 追加 13 元素样式 |

---

## 八、当前架构

```
用户请求 (localhost:3000)
  │
  ▼
Next.js 前端 (marked MD 渲染 + SSE 流式)
  │  /api/chat/stream
  ▼
FastAPI 后端 (localhost:8000)
  ├── Embedding (Ollama 127.0.0.1:11434, httpx keep-alive)
  ├── ChromaDB 向量召回 20
  ├── BM25 关键词召回 20（缓存索引）
  ├── 合并去重 → 上限截断
  ├── CrossEncoder Reranker 精排（CPU 预热+多线程）
  ├── 相邻块扩展
  └── DeepSeek V4-Pro API 流式生成
```

平均延迟 ~13s（Reranker CPU ~6s 为主瓶颈，DeepSeek ~2s，其余 ~5s）。
