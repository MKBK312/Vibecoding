import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, updateDocumentSummary } from '@/lib/db/collections';
import { semanticSearch } from '@/lib/embedding/search';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = await getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const searchResults = await semanticSearch(`为以下文档生成结构化摘要：${doc.title}`, 3);

  const context = searchResults.map(r => r.content).join('\n\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: '你是学术研究助手。请根据提供的文档内容，生成一个结构化摘要，格式如下：\n\n## 背景\n简要说明文档的背景和目的。\n\n## 方法\n描述文档使用的主要方法或方法论。\n\n## 结论\n总结文档的主要结论或发现。\n\n## 要点\n列出3-5个关键要点。',
    messages: [{
      role: 'user',
      content: `请为以下文档生成结构化摘要：\n\n${context}`,
    }],
  });

  const summary = message.content[0].type === 'text' ? message.content[0].text : '';

  await updateDocumentSummary(id, summary);

  return NextResponse.json({ summary });
}
