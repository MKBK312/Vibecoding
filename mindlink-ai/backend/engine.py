"""
查询引擎：检索 + 流式 LLM 生成

负责：
1. 将用户问题向量化，从 ChromaDB 检索 Top-K 相似文本块
2. 构造带引用的中文 Prompt
3. 通过 Ollama (DeepSeek-R1) 流式生成回答，输出 SSE 事件流
"""

import json
from typing import AsyncGenerator, List

from llama_index.llms.ollama import Ollama

from config import (
    LLM_MODEL,
    OLLAMA_BASE_URL,
    DEFAULT_TOP_K,
    DEFAULT_TEMPERATURE,
)
from pipeline import get_or_create_collection, get_embed_model as _get_embed_model
from models import SourceCitation


def _get_llm(temperature: float = DEFAULT_TEMPERATURE) -> Ollama:
    """每次调用新建 LLM 实例（temperature 可能不同）"""
    return Ollama(
        model=LLM_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
        request_timeout=120.0,
    )


def search_chunks(query: str, top_k: int = DEFAULT_TOP_K) -> List[SourceCitation]:
    """
    向量化用户问题，从 ChromaDB 检索 Top-K 相似文本块。
    将余弦距离转换为相似度评分：score = 1.0 - distance
    """
    embed_model = _get_embed_model()
    query_embedding = embed_model.get_text_embedding(query)

    collection = get_or_create_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    sources: List[SourceCitation] = []
    # ChromaDB 返回格式: {"ids": [[id1, id2, ...]], "documents": [[doc1, doc2, ...]], ...}
    if results.get("ids") and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            # 余弦距离转相似度：距离范围 [0, 2]，截断到 [0, 1] 后取反
            raw_distance = results["distances"][0][i] if results.get("distances") else 0.0
            score = 1.0 - min(raw_distance, 1.0)

            page_num = meta.get("page_number", -1)
            sources.append(SourceCitation(
                document_id=meta.get("document_id", ""),
                document_title=meta.get("filename", "未知文件"),
                page_number=page_num if page_num >= 0 else None,
                content=results["documents"][0][i][:300],  # 截取前 300 字符展示
                score=round(score, 4),
            ))

    # 按相似度降序排列
    sources.sort(key=lambda s: s.score, reverse=True)
    return sources


def _build_prompt(question: str, sources: List[SourceCitation]) -> str:
    """
    构造带编号引用的中文 Prompt 模板。
    每个参考资料以 [N] 标注，要求 LLM 回答时引用 [文件名:页码]。
    """
    refs = []
    for i, src in enumerate(sources, 1):
        page_info = f"第{src.page_number}页" if src.page_number else "未知页"
        refs.append(
            f"[{i}] 《{src.document_title}》{page_info}: \"{src.content}\""
        )

    ref_text = "\n".join(refs)

    return f"""你是一个学术研究助手。请基于以下参考资料回答问题，引用来源时使用 [文件名:页码] 格式。

参考资料：
{ref_text}

问题：{question}

回答要求：
- 基于参考资料，不编造信息
- 引用时标注 [文件名:页码]
- 如果参考资料不足以回答问题，请明确指出"""


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

    # Step 2: 构造 Prompt
    prompt = _build_prompt(question, sources)

    # Step 3: 流式生成
    llm = _get_llm(temperature)

    try:
        for chunk in llm.stream_complete(prompt):
            delta = chunk.delta if hasattr(chunk, "delta") else str(chunk)
            if delta:
                event = {"type": "text", "content": delta, "sources": []}
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': f'LLM 生成失败: {str(e)}', 'sources': []})}\n\n"
        return

    # Step 4: 发送溯源信息
    sources_data = [s.model_dump() for s in sources]
    yield f"data: {json.dumps({'type': 'sources', 'content': '', 'sources': sources_data}, ensure_ascii=False)}\n\n"

    # Step 5: 发送结束信号
    yield f"data: {json.dumps({'type': 'done', 'content': '', 'sources': []})}\n\n"
