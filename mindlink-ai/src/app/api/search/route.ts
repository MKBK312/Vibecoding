import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch } from '@/lib/embedding/search';
import { DEFAULT_TOP_K } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { query, topK = DEFAULT_TOP_K } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await semanticSearch(query, topK);

    return NextResponse.json({ results, query, topK: results.length });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
