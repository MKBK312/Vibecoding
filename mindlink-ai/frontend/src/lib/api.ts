import type { DocumentInfo, UploadResponse, DeleteResponse, ConfigResponse } from "./types";

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function deleteDocument(id: string): Promise<DeleteResponse> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}
