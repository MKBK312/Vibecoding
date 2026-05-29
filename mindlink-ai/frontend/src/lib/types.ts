export interface DocumentInfo {
  id: string;
  filename: string;
  source_type: "pdf" | "markdown" | "txt" | "docx";
  page_count: number | null;
  chunk_count: number;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_title: string;
  page_number: number | null;
  content: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: SourceCitation[];
  createdAt: string;
}

export interface UploadResponse {
  id: string;
  filename: string;
  page_count: number | null;
  chunk_count: number;
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  deleted_chunks: number;
}

export interface ConfigResponse {
  top_k: number;
  temperature: number;
  llm_backend: string;
  llm_model: string;
  embedding_model: string;
  active_collection: string;
  collections: string[];
  total_documents: number;
  total_chunks: number;
}

export interface KnowledgeBaseInfo {
  name: string;
  total_documents: number;
  total_chunks: number;
}
