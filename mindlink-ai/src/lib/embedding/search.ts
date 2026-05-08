import { getCollection } from '../db/chroma';
import { COLLECTION_NAMES } from '../constants';
import { generateEmbedding } from './encoder';
import type { SearchResult } from '../types';

export async function semanticSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  const collection = await getCollection(COLLECTION_NAMES.CHUNKS);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ['documents', 'metadatas', 'distances'],
  });

  const searchResults: SearchResult[] = [];

  if (results.documents && results.documents.length > 0) {
    const documents = results.documents[0];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    for (let i = 0; i < documents.length; i++) {
      const metadata = metadatas[i] as Record<string, unknown> | undefined;
      const documentId = metadata?.document_id as string || '';

      let documentTitle = '未知文档';
      try {
        const docsCollection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
        const docResult = await docsCollection.get({ ids: [documentId] });
        if (docResult.documents.length > 0) {
          const docData = JSON.parse(docResult.documents[0]);
          documentTitle = docData.title || '未知文档';
        }
      } catch {
        // Use default title
      }

      searchResults.push({
        id: results.ids?.[0]?.[i] || '',
        document_id: documentId,
        content: documents[i],
        page_number: (metadata?.page_number as number | null) || null,
        score: 1 - (distances[i] || 0),
        document_title: documentTitle,
      });
    }
  }

  return searchResults;
}
