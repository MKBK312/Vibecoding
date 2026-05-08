import { pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '../constants';

let embeddingPipeline: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', EMBEDDING_MODEL, {
      pooling: 'mean',
      normalize: true,
    });
  }
  return embeddingPipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const result = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });
  return Array.from(result.data);
}
