import { NextResponse } from 'next/server';
import { getDocumentCount } from '@/lib/db/collections';

export async function GET() {
  try {
    const documentCount = await getDocumentCount();

    return NextResponse.json({
      topK: 5,
      embeddingModel: 'bge-small-zh',
      llmProvider: 'Claude',
      documentCount,
      totalPages: 0,
      isReady: documentCount > 0,
    });
  } catch (error) {
    console.error('Config error:', error);
    return NextResponse.json({
      topK: 5,
      embeddingModel: 'bge-small-zh',
      llmProvider: 'Claude',
      documentCount: 0,
      totalPages: 0,
      isReady: false,
    });
  }
}
