"""
查询引擎：检索 + 流式 LLM 生成

负责：
1. 将用户问题向量化，从 ChromaDB 检索 Top-K 相似文本块
2. 构造带引用的中文 Prompt
3. 通过 Claude API (默认) 或 Ollama 流式生成回答，输出 SSE 事件流
"""

import json
from typing import AsyncGenerator, List

import httpx

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
)
from pipeline import get_or_create_collection, get_embed_model as _get_embed_model
from models import SourceCitation

# Reranker 单例延迟加载（首次下载 ~2.2GB 模型，之后常驻内存）
_reranker = None


def _get_reranker():
    global _reranker
    if _reranker is None:
        from sentence_transformers import CrossEncoder
        _reranker = CrossEncoder("BAAI/bge-reranker-v2-m3", device="cpu")
    return _reranker


def search_chunks(query: str, top_k: int = DEFAULT_TOP_K) -> List[SourceCitation]:
    """
    两阶段检索：
    1. ChromaDB 余弦粗召回 RERANK_CANDIDATE_K 个候选
    2. CrossEncoder Reranker 精排，取 Top-K 个送入 LLM
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

    # 相似度阈值过滤（在粗召回后执行）
    if candidates:
        max_vec_score = max(c.score for c in candidates)
        if max_vec_score < MIN_SIMILARITY_SCORE:
            return []

    # Reranker 精排：对 (query, chunk) 逐对打分
    if len(candidates) > top_k:
        reranker = _get_reranker()
        pairs = [(query, c.content) for c in candidates]
        rerank_scores = reranker.predict(pairs, show_progress_bar=False)

        for c, rs in zip(candidates, rerank_scores):
            c.score = round(float(rs), 4)

        # 按 Rerank 分数降序排列，取 Top-K
        candidates.sort(key=lambda s: s.score, reverse=True)

    return candidates[:top_k]


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
- 只回答和问题直接相关的内容，不要延伸无关话题
- 基于参考资料中与问题直接相关的信息，不编造信息
- 引用时标注 [文件名:页码]
- 如果参考资料不足以回答问题，请明确指出"""


async def stream_chat_claude(
    system_prompt: str,
    question: str,
    sources: List[SourceCitation],
    temperature: float = DEFAULT_TEMPERATURE,
) -> AsyncGenerator[str, None]:
    """通过 Claude 兼容 API 流式生成，输出 SSE 事件（使用 httpx）"""
    url = f"{ANTHROPIC_BASE_URL}/v1/messages"

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 4096,
        "temperature": temperature,
        "stream": True,
        "system": system_prompt,
        "messages": [{"role": "user", "content": question}],
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
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data}, ensure_ascii=False)}\n\n"
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
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data}, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"


async def stream_chat(
    question: str,
    top_k: int = DEFAULT_TOP_K,
    temperature: float = DEFAULT_TEMPERATURE,
) -> AsyncGenerator[str, None]:
    """
    流式对话生成器，输出 SSE 事件格式的字符串。

    事件流程：
      1. 检索 -> 发送 "text" 类型的流式内容
      2. 发送 "sources" 事件携带引用溯源信息
      3. 发送 "done" 事件表示流结束

    每行格式: data: {"type":"...","content":"...","sources":[...]}\n\n
    """
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
        # Ollama 把 system prompt + question 合并成一个 prompt
        full_prompt = f"{system_prompt}\n\n问题：{question}"
        async for event in stream_chat_ollama(full_prompt, sources, temperature):
            yield event
    else:
        # 默认用 Claude API
        async for event in stream_chat_claude(system_prompt, question, sources, temperature):
            yield event
