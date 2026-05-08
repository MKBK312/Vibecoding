import { getOrCreateCollection, getCollection } from './chroma';
import { COLLECTION_NAMES } from '../constants';
import type { DocumentMeta, DocumentChunk } from '../types';

export async function addDocument(doc: DocumentMeta): Promise<void> {
  const collection = await getOrCreateCollection(COLLECTION_NAMES.DOCUMENTS);
  await collection.add({
    ids: [doc.id],
    metadatas: [doc.metadata],
    documents: [JSON.stringify({
      id: doc.id,
      title: doc.title,
      source_type: doc.source_type,
      file_path: doc.file_path,
      file_hash: doc.file_hash,
      summary: doc.summary,
      chunk_count: doc.chunk_count,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    })],
  });
}

export async function getDocumentById(id: string): Promise<DocumentMeta | null> {
  try {
    const collection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
    const result = await collection.get({
      ids: [id],
    });
    if (result.documents.length === 0) return null;
    return JSON.parse(result.documents[0]);
  } catch {
    return null;
  }
}

export async function getAllDocuments(): Promise<DocumentMeta[]> {
  try {
    const collection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
    const result = await collection.get();
    return result.documents.map((doc) => JSON.parse(doc));
  } catch {
    return [];
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const collection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
  await collection.delete({ ids: [id] });
}

export async function updateDocumentSummary(id: string, summary: string): Promise<void> {
  const collection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
  const result = await collection.get({ ids: [id] });
  if (result.documents.length === 0) return;

  const doc = JSON.parse(result.documents[0]);
  doc.summary = summary;
  doc.updated_at = new Date().toISOString();

  await collection.update({
    ids: [id],
    documents: [JSON.stringify(doc)],
  });
}

export async function addChunk(chunk: DocumentChunk): Promise<void> {
  const collection = await getOrCreateCollection(COLLECTION_NAMES.CHUNKS);
  await collection.add({
    ids: [chunk.id],
    metadatas: [chunk.metadata],
    documents: [chunk.content],
    embeddings: [],
  });
}

export async function addChunks(chunks: DocumentChunk[]): Promise<void> {
  if (chunks.length === 0) return;
  const collection = await getOrCreateCollection(COLLECTION_NAMES.CHUNKS);
  await collection.add({
    ids: chunks.map((c) => c.id),
    metadatas: chunks.map((c) => c.metadata),
    documents: chunks.map((c) => c.content),
    embeddings: [],
  });
}

export async function getChunksByDocumentId(documentId: string): Promise<DocumentChunk[]> {
  try {
    const collection = await getCollection(COLLECTION_NAMES.CHUNKS);
    const result = await collection.get();
    return result.documents
      .map((doc, i) => ({
        id: result.ids[i],
        content: doc,
        metadata: result.metadatas[i] as Record<string, unknown>,
        document_id: result.metadatas[i]?.document_id as string,
        chunk_index: result.metadatas[i]?.chunk_index as number,
        page_number: result.metadatas[i]?.page_number as number | null,
      }))
      .filter((c) => c.document_id === documentId)
      .sort((a, b) => a.chunk_index - b.chunk_index);
  } catch {
    return [];
  }
}

export async function deleteChunksByDocumentId(documentId: string): Promise<void> {
  const collection = await getCollection(COLLECTION_NAMES.CHUNKS);
  const result = await collection.get();
  const toDelete = result.ids.filter((_, i) => result.metadatas[i]?.document_id === documentId);
  if (toDelete.length > 0) {
    await collection.delete({ ids: toDelete });
  }
}

export async function getDocumentCount(): Promise<number> {
  try {
    const collection = await getCollection(COLLECTION_NAMES.DOCUMENTS);
    const result = await collection.get();
    return result.documents.length;
  } catch {
    return 0;
  }
}
