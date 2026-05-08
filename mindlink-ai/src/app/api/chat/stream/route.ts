import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { semanticSearch } from '@/lib/embedding/search';
import { DEFAULT_TOP_K } from '@/lib/constants';

const client = new Anthropic();

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('anthropic_api_key') || '';
  }
  return process.env.ANTHROPIC_API_KEY || '';
}

export async function POST(request: NextRequest) {
  const { message, topK = DEFAULT_TOP_K } = await request.json();
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 401 });
  }

  const searchResults = await semanticSearch(message, topK);

  const context = searchResults
    .map((r, i) => `[${i + 1}] ${r.document_title}${r.page_number ? ` (p.${r.page_number})` : ''}:\n${r.content}`)
    .join('\n\n');

  const systemPrompt = `你是学术研究助手，基于提供的上下文回答用户问题。

回答时必须标注来源，使用格式：[文件名:页码]
例如：[paper.pdf:3] 或 [notes.md]

如果你需要引用多个来源，按格式标注每个引用。

上下文：
${context}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const response = await client.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        }, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.type === 'content_block_delta') {
            const text = event.type === 'content_block_delta' ? (event as { type: 'content_block_delta'; delta: { type: string; text: string } }).delta.text : '';
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n`));
            }
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: searchResults })}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n`));
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
