import type {
  DocumentInfo,
  UploadResponse,
  DeleteResponse,
  ConfigResponse,
  KnowledgeBaseInfo,
  TokenResponse,
  LoginRequest,
  RegisterRequest,
  ChatMessageResponse,
} from "./types";

export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// --- 认证辅助 ---

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  for (const [k, v] of Object.entries(authHeaders())) {
    headers.set(k, v);
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  return res;
}

// --- 认证 API ---

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "登录失败" }));
    throw new Error(err.detail || "登录失败");
  }
  return res.json();
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "注册失败" }));
    throw new Error(err.detail || "注册失败");
  }
  return res.json();
}

// --- 对话历史 API ---

export async function fetchChatHistory(): Promise<ChatMessageResponse[]> {
  const res = await authFetch(`${BASE_URL}/api/chat/history`);
  if (!res.ok) throw new Error("Failed to fetch chat history");
  return res.json();
}

export async function clearChatHistory(): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/chat/history`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear chat history");
}

// --- 业务 API（均需认证） ---

export async function fetchDocuments(): Promise<DocumentInfo[]> {
  const res = await authFetch(`${BASE_URL}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch(`${BASE_URL}/api/upload`, {
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
  const res = await authFetch(`${BASE_URL}/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await authFetch(`${BASE_URL}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function fetchKnowledgeBases(): Promise<KnowledgeBaseInfo[]> {
  const res = await authFetch(`${BASE_URL}/api/knowledge-bases`);
  if (!res.ok) throw new Error("Failed to fetch knowledge bases");
  return res.json();
}

export async function createKnowledgeBase(name: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/knowledge-bases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection: name }),
  });
  if (!res.ok) throw new Error("Failed to create knowledge base");
}

export async function switchKnowledgeBase(name: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/api/knowledge-bases/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ collection: name }),
  });
  if (!res.ok) throw new Error("Failed to switch knowledge base");
}
