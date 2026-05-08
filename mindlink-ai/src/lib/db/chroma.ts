import { ChromaClient, WhereFilter } from 'chromadb';
import path from 'path';

const CHROMA_PATH = path.join(process.cwd(), 'data', 'chroma');

let client: ChromaClient | null = null;

export async function getChromaClient(): Promise<ChromaClient> {
  if (!client) {
    client = new ChromaClient({ path: CHROMA_PATH });
  }
  return client;
}

export async function getCollection(collectionName: string) {
  const chroma = await getChromaClient();
  return await chroma.getCollection({
    name: collectionName,
    metadata: { 'hnsw:space': 'cosine' },
  });
}

export async function getOrCreateCollection(collectionName: string) {
  const chroma = await getChromaClient();
  try {
    return await chroma.getCollection({ name: collectionName });
  } catch {
    return await chroma.createCollection({
      name: collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
  }
}
