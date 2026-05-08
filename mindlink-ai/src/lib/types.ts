export interface DocumentMeta {
  id: string;
  title: string;
  source_type: 'pdf' | 'markdown';
  file_path: string;
  file_hash: string;
  metadata: Record<string, unknown>;
  summary?: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  score: number;
  document_title: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  page_number: number | null;
  content: string;
  score: number;
}

export interface Config {
  topK: number;
  embeddingModel: string;
  llmProvider: string;
  anthropicApiKey?: string;
}

export interface PDFPage {
  pageNumber: number;
  content: string;
}

export interface PDFDocument {
  title: string;
  pageCount: number;
  pages: PDFPage[];
}

export interface MarkdownDocument {
  title: string;
  content: string;
  frontMatter: Record<string, unknown>;
  sections: { heading: string; content: string }[];
}
