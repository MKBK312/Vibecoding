export const COLLECTION_NAMES = {
  DOCUMENTS: 'documents',
  CHUNKS: 'chunks',
} as const;

export const DEFAULT_TOP_K = 5;
export const MIN_TOP_K = 1;
export const MAX_TOP_K = 20;

export const CHUNK_MIN_CHARS = 500;
export const CHUNK_MAX_CHARS = 800;

export const EMBEDDING_MODEL = 'bge-small-zh';
export const EMBEDDING_DIMENSIONS = 384;

export const SUPPORTED_FILE_TYPES = ['pdf', 'markdown', 'md'];

export const API_ROUTES = {
  DOCUMENTS_UPLOAD: '/api/documents/upload',
  DOCUMENTS: '/api/documents',
  DOCUMENT_BY_ID: (id: string) => `/api/documents/${id}`,
  DOCUMENT_REINDEX: (id: string) => `/api/documents/${id}/reindex`,
  SEARCH: '/api/search',
  CHAT_STREAM: '/api/chat/stream',
  SUMMARY: (id: string) => `/api/summary/${id}`,
  CONFIG: '/api/config',
} as const;
