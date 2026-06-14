"""
查询引擎：检索 + 流式 LLM 生成

负责：
1. 将用户问题向量化，从 ChromaDB 检索 Top-K 相似文本块
2. 构造带引用的中文 Prompt
3. 通过 Claude API (默认) 或 Ollama 流式生成回答，输出 SSE 事件流
"""

import json
import re
from typing import AsyncGenerator, List, Dict, Any, Optional

import httpx
from rank_bm25 import BM25Okapi

from config import (
    LLM_MODEL,
    OLLAMA_BASE_URL,
    ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL,
    CLAUDE_MODEL,
    LLM_BACKEND,
    DEFAULT_TOP_K,
    DEFAULT_TEMPERATURE,
    MIN_SIMILARITY_SCORE,
    RERANK_CANDIDATE_K,
    RERANK_MAX_PAIRS,
    BM25_CANDIDATE_K,
)
from pipeline import get_or_create_collection, get_embed_model as _get_embed_model
from models import SourceCitation

# Reranker 单例延迟加载（首次下载 ~2.2GB 模型，之后常驻内存）
_reranker = None

# 最近一次检索统计（用于调试/验证）
_last_retrieval_stats: Dict[str, int] = {}

# BM25 索引缓存（文档不变时复用，避免每次请求重建）
_bm25_cache: Dict[str, Any] = {}


def init_reranker():
    """后端启动时预加载 Reranker 模型，避免首次请求时阻塞"""
    _get_reranker()


def _get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", device="cuda")
    return _reranker


# 中文停用词（虚词/常见单字，过滤掉防止 BM25 噪声污染）
_STOP_CHARS = set("的了是在和与不也就都要会能这那有人大中上下个从为以到而且或被把让但由于之所可它们每什么")


def _tokenize(text: str) -> List[str]:
    """中英混合分词：CJK 字符按单字 + bigram 切分，英文按空格切词后追加相邻 bigram"""
    tokens: List[str] = []
    # 用正则分离 CJK 单字和非 CJK 连续段
    for chunk in re.split(r"([\u4e00-\u9fff\u3400-\u4dbf])", text):
        if not chunk:
            continue
        if re.match(r"[\u4e00-\u9fff\u3400-\u4dbf]", chunk):
            tokens.append(chunk)
        else:
            for word in chunk.lower().split():
                word = word.strip(".,;:!?\"'()[]{}，。；：！？""'（）【】")
                if word:
                    tokens.append(word)
    # 追加 bigram
    bigrams = [tokens[i] + tokens[i + 1] for i in range(len(tokens) - 1)]
    all_tokens = tokens + bigrams

    # 停用词过滤：去除中文虚词单字及其衍生的 bigram
    filtered: List[str] = []
    for tok in all_tokens:
        # ASCII/英文词不过滤，直接保留
        if all(c < '\u4e00' for c in tok):
            filtered.append(tok)
        elif any(c in _STOP_CHARS for c in tok):
            continue
        else:
            filtered.append(tok)
    return filtered


def _get_bm25_index(collection):
    """获取或构建 BM25 索引（缓存复用，仅在文档数变化时重建）"""
    global _bm25_cache
    coll_name = collection.name
    chunk_count = collection.count()

    cache = _bm25_cache.get(coll_name)
    if cache and cache.get("chunk_count") == chunk_count:
        return cache["corpus"], cache["metas"], cache["index"]

    # 缓存未命中：拉全量数据建索引
    all_chunks = collection.get(include=["documents", "metadatas"])
    corpus = list(all_chunks.get("documents") or [])
    metas = all_chunks.get("metadatas") or []
    tokenized_corpus = [_tokenize(doc) for doc in corpus]
    bm25_index = BM25Okapi(tokenized_corpus)

    _bm25_cache[coll_name] = {
        "corpus": corpus,
        "metas": metas,
        "index": bm25_index,
        "chunk_count": chunk_count,
    }
    return corpus, metas, bm25_index


def search_chunks(query: str, top_k: int = DEFAULT_TOP_K) -> List[SourceCitation]:
    """
    混合检索（BM25 + 向量）：
    1. ChromaDB 余弦粗召回 RERANK_CANDIDATE_K 个候选
    2. BM25 关键词并行检索 BM25_CANDIDATE_K 个候选，合并去重
    3. CrossEncoder Reranker 精排，取 Top-K 个
    4. 相邻块扩展：对每个选中块，补上同文档的前后块，避免跨块内容截断
    """
    embed_model = _get_embed_model()
    query_embedding = embed_model.get_text_embedding(query)

    collection = get_or_create_collection()
    candidate_k = max(top_k, RERANK_CANDIDATE_K)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=candidate_k,
    )

    # 构建候选列表
    candidates: List[SourceCitation] = []
    # 额外记录每个候选在原始文档中的 chunk_index，用于相邻块扩展
    _ci: List[int] = []
    if results.get("ids") and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            raw_distance = results["distances"][0][i] if results.get("distances") else 0.0
            score = 1.0 - min(raw_distance, 1.0)
            page_num = meta.get("page_number", -1)
            candidates.append(SourceCitation(
                document_id=meta.get("document_id", ""),
                document_title=meta.get("filename", "未知文件"),
                page_number=page_num if page_num >= 0 else None,
                content=results["documents"][0][i],
                score=round(score, 4),
            ))
            _ci.append(meta.get("chunk_index", 0))

    # === BM25 关键词并行检索（索引缓存，文档不变时不重建） ===
    corpus, metas, bm25_index = _get_bm25_index(collection)
    bm25_candidates: List[SourceCitation] = []
    if corpus:
        tokenized_query = _tokenize(query)
        bm25_scores = bm25_index.get_scores(tokenized_query)
        bm25_top_indices = sorted(
            range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True
        )[:BM25_CANDIDATE_K]

        # === BM25 质量门：检测结果是否包含有效信号 ===
        bm25_passed = False
        if bm25_top_indices:
            all_scores = [bm25_scores[i] for i in range(len(bm25_scores))]
            median = sorted(all_scores)[len(all_scores) // 2]
            # 条件 A：信号突出（top-1 远超中位数，说明有关键词命中）
            signal_strong = bm25_scores[bm25_top_indices[0]] >= median * 1.5
            # 条件 B：双路验证（与向量 top-5 有内容重叠）
            bm25_contents = {corpus[i] for i in bm25_top_indices[:5]}
            vec_contents = {c.content for c in candidates[:5]}
            overlap = len(bm25_contents & vec_contents) > 0
            bm25_passed = signal_strong or overlap

        # 按 content 去重合并（仅质量门通过时）
        if bm25_passed:
            seen_content = {c.content for c in candidates}
            for idx in bm25_top_indices:
                content = corpus[idx]
                if content in seen_content:
                    continue
                seen_content.add(content)
                meta = metas[idx] if idx < len(metas) else {}
                page_num = meta.get("page_number", -1)
                bm25_candidates.append(SourceCitation(
                    document_id=meta.get("document_id", ""),
                    document_title=meta.get("filename", "未知文件"),
                    page_number=page_num if page_num >= 0 else None,
                    content=content,
                    score=round(float(bm25_scores[idx]), 4),
                ))
                _ci.append(meta.get("chunk_index", 0))
            candidates.extend(bm25_candidates)
            _last_retrieval_stats["vec"] = len(candidates) - len(bm25_candidates)
            _last_retrieval_stats["bm25"] = len(bm25_candidates)
            _last_retrieval_stats["merged"] = len(candidates)
        else:
            _last_retrieval_stats["vec"] = len(candidates)
            _last_retrieval_stats["bm25"] = 0
            _last_retrieval_stats["merged"] = len(candidates)

    # 相似度阈值过滤：仅检查向量检索的最高分
    # BM25 候选项已命中关键词，不经过余弦阈值筛选
    vec_scores = [c.score for c in candidates[: len(candidates) - len(bm25_candidates)]]
    vec_max = max(vec_scores) if vec_scores else 0.0
    if not bm25_candidates and vec_max < MIN_SIMILARITY_SCORE:
        return []

    # 限制 Reranker 候选对数（各来源按比例截断，避免量纲不同导致倾斜）
    vec_count = len(candidates) - len(bm25_candidates)
    if len(candidates) > RERANK_MAX_PAIRS:
        half = RERANK_MAX_PAIRS // 2
        vec_limit = min(vec_count, half if len(bm25_candidates) > 0 else RERANK_MAX_PAIRS)
        bm25_limit = RERANK_MAX_PAIRS - vec_limit

        # 向量候选按余弦分数排序取前 vec_limit
        vec_candidates = candidates[:vec_count]
        vec_sorted = sorted(enumerate(vec_candidates), key=lambda x: x[1].score, reverse=True)
        vec_keep = {idx for idx, _ in vec_sorted[:vec_limit]}

        # BM25 候选按 BM25 分数排序取前 bm25_limit
        bm25_sorted = sorted(
            range(vec_count, len(candidates)),
            key=lambda i: candidates[i].score, reverse=True
        )
        bm25_keep = {idx for idx in bm25_sorted[:bm25_limit]}

        keep_indices = sorted(vec_keep | bm25_keep)
        candidates = [candidates[i] for i in keep_indices]
        _ci = [_ci[i] for i in keep_indices]
        bm25_candidates = [c for c in bm25_candidates if c in candidates]

    # Reranker 精排：对 (query, chunk) 逐对打分
    if len(candidates) > top_k:
        try:
            reranker = _get_reranker()
            pairs = [(query, c.content) for c in candidates]
            rerank_scores = reranker.predict(pairs, show_progress_bar=False)
        except Exception as e:
            print(f"[Reranker] 精排失败，回退到向量分数排序: {e}", flush=True)
            rerank_scores = None

        if rerank_scores is not None:
            for c, rs in zip(candidates, rerank_scores):
                c.score = round(float(rs), 4)

            # 按 Rerank 分数降序排列，取 Top-K
            sorted_pairs = sorted(enumerate(candidates), key=lambda x: x[1].score, reverse=True)
            selected_indices = [idx for idx, _ in sorted_pairs[:top_k]]
            selected = [candidates[idx] for idx in selected_indices]
        else:
            # Reranker 不可用，直接按原始分数（向量/BM25）排序
            sorted_pairs = sorted(enumerate(candidates), key=lambda x: x[1].score, reverse=True)
            selected_indices = [idx for idx, _ in sorted_pairs[:top_k]]
            selected = [candidates[idx] for idx in selected_indices]
    else:
        selected = candidates[:top_k]
        selected_indices = list(range(len(selected)))

    # 相邻块扩展：对每个精排选中的块，从 ChromaDB 查找同文档相邻 chunk_index 的块
    expanded = list(selected)
    seen = {c.content for c in selected}
    for idx in selected_indices:
        c = candidates[idx]
        ci = _ci[idx]
        try:
            siblings = collection.get(
                where={
                    "$and": [
                        {"document_id": c.document_id},
                        {"$or": [
                            {"chunk_index": ci - 1},
                            {"chunk_index": ci + 1},
                        ]}
                    ]
                },
                include=["documents", "metadatas"],
            )
            if siblings.get("documents"):
                for j, sib_text in enumerate(siblings["documents"]):
                    if sib_text not in seen:
                        sm = siblings["metadatas"][j]
                        sp = sm.get("page_number", -1)
                        expanded.append(SourceCitation(
                            document_id=c.document_id,
                            document_title=c.document_title,
                            page_number=sp if sp >= 0 else None,
                            content=sib_text,
                            score=c.score,  # 继承所属精排块的分数
                        ))
                        seen.add(sib_text)
        except Exception:
            pass

    return expanded[:top_k * 2]


def _build_system_prompt(sources: List[SourceCitation]) -> str:
    """构造给 Claude/Ollama 的系统提示 + 参考资料"""
    refs = []
    for i, src in enumerate(sources, 1):
        page_info = f"第{src.page_number}页" if src.page_number else "未知页"
        refs.append(
            f"[{i}] 《{src.document_title}》{page_info}: \"{src.content}\""
        )

    ref_text = "\n".join(refs)

    return f"""你是一个严谨的学术研究助手。请基于以下参考资料回答问题。

重要：参考资料中可能包含与问题无关的内容。你只能使用与问题直接相关的部分，忽略不相关的内容。

参考资料：
{ref_text}

回答要求：
- 参考资料中如果包含多个并列的要点（如列举、分类、对比），必须逐条全部列出，不得省略任何一条
- 只回答和问题直接相关的内容，不要延伸无关话题
- 基于参考资料中与问题直接相关的信息，不编造信息
- 引用时标注 [文件名:页码]
- 如果参考资料不足以回答问题，请明确指出"""


async def stream_chat_claude(
    system_prompt: str,
    question: str,
    sources: List[SourceCitation],
    temperature: float = DEFAULT_TEMPERATURE,
    history: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """通过 Claude 兼容 API 流式生成，输出 SSE 事件（使用 httpx）"""
    url = f"{ANTHROPIC_BASE_URL}/v1/messages"

    messages: List[Dict[str, str]] = []
    if history:
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": question})

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "temperature": temperature,
        "stream": True,
        "system": system_prompt,
        "messages": messages,
    }

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    yield f"data: {json.dumps({'type': 'error', 'content': f'API 错误 ({response.status_code}): {body.decode()[:200]}', 'sources': []})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[len("data: "):]
                        try:
                            data = json.loads(data_str)
                        except json.JSONDecodeError:
                            continue
                        if data.get("type") == "content_block_delta":
                            delta = data.get("delta", {})
                            text = delta.get("text", "")
                            if text:
                                event = {"type": "text", "content": text, "sources": []}
                                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    except httpx.TimeoutException:
        yield f"data: {json.dumps({'type': 'error', 'content': 'API 请求超时', 'sources': []})}\n\n"
        return
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'Claude API 调用失败: {str(e)}', 'sources': []})}\n\n"
        return

    # 发送溯源信息
    sources_data = [s.model_dump() for s in sources]
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data, 'retrieval_stats': _last_retrieval_stats}, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"


async def stream_chat_ollama(
    prompt: str,
    sources: List[SourceCitation],
    temperature: float = DEFAULT_TEMPERATURE,
) -> AsyncGenerator[str, None]:
    """通过 Ollama 流式生成，输出 SSE 事件（原有逻辑，作备选）"""
    from llama_index.llms.ollama import Ollama

    llm = Ollama(
        model=LLM_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
        request_timeout=120.0,
        additional_kwargs={"options": {"num_gpu": 0}},  # 强制 CPU 模式（RTX 4060 8GB 不够）
    )

    try:
        for chunk in llm.stream_complete(prompt):
            delta = chunk.delta if hasattr(chunk, "delta") else str(chunk)
            if delta:
                event = {"type": "text", "content": delta, "sources": []}
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'Ollama 生成失败: {str(e)}', 'sources': []})}\n\n"
        return

    sources_data = [s.model_dump() for s in sources]
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data, 'retrieval_stats': _last_retrieval_stats}, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"


async def stream_chat(
    question: str,
    top_k: int = DEFAULT_TOP_K,
    temperature: float = DEFAULT_TEMPERATURE,
    history: Optional[List[Dict[str, str]]] = None,
) -> AsyncGenerator[str, None]:
    """
    流式对话生成器，输出 SSE 事件格式的字符串。

    事件流程：
      1. 检索 -> 发送 "text" 类型的流式内容
      2. 发送 "sources" 事件携带引用溯源信息
      3. 发送 "done" 事件表示流结束

    每行格式: data: {"type":"...","content":"...","sources":[...]}\n\n
    """
    # 限制历史消息数量，防止超出上下文窗口
    if history:
        history = history[-20:]

    # Step 1: 检索相关文本块
    sources = search_chunks(question, top_k)

    if not sources:
        yield f"data: {json.dumps({'type': 'text', 'content': '未找到相关参考资料，请先上传文档后再提问。', 'sources': []})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"
        return

    # 注：此处不额外做阈值过滤 —— search_chunks() 已在粗召回阶段用余弦相似度做了一次
    # MIN_SIMILARITY_SCORE 过滤，且 Reranker 分数为 CrossEncoder logits，与余弦相似度无量纲可比性。

    # Step 2: 构造 Prompt
    system_prompt = _build_system_prompt(sources)

    # Step 3: 根据后端选择流式生成
    if LLM_BACKEND == "ollama":
        if history:
            history_lines = []
            for h in history:
                prefix = "用户" if h["role"] == "user" else "助手"
                history_lines.append(f"{prefix}：{h['content']}")
            history_text = "\n\n".join(history_lines)
            full_prompt = f"{system_prompt}\n\n历史对话：\n{history_text}\n\n问题：{question}"
        else:
            full_prompt = f"{system_prompt}\n\n问题：{question}"
        async for event in stream_chat_ollama(full_prompt, sources, temperature):
            yield event
    else:
        # 默认用 Claude API
        async for event in stream_chat_claude(system_prompt, question, sources, temperature, history=history):
            yield event
