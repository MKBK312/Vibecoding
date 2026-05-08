"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain,
  Upload,
  FileText,
  Trash2,
  Send,
  Loader2,
  ChevronDown,
  Bot,
  User,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { marked } from "marked";
import type {
  DocumentInfo,
  ChatMessage,
  SourceCitation,
  ConfigResponse,
} from "@/lib/types";
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  fetchConfig,
} from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function msgId() {
  return crypto.randomUUID();
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  // ── sidebar state ──
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.7);

  // ── chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── upload state ──
  const [uploading, setUploading] = useState(false);

  // ── source collapse state ──
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});

  // ── load documents & config on mount ──
  const loadDocuments = useCallback(async () => {
    try {
      setDocsLoading(true);
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch {
      // silent on first load
    } finally {
      setDocsLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await fetchConfig();
      setConfig(cfg);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadConfig();
  }, [loadDocuments, loadConfig]);

  // ── auto scroll ──
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // ── file upload ──
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        setUploading(true);
        try {
          await uploadDocument(file);
          await loadDocuments();
          await loadConfig();
        } catch (err: any) {
          alert("上传失败: " + (err.message || "未知错误"));
        } finally {
          setUploading(false);
        }
      }
    },
    [loadDocuments, loadConfig]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
  });

  // ── delete document ──
  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      await loadDocuments();
      await loadConfig();
    } catch (err: any) {
      alert("删除失败: " + (err.message || "未知错误"));
    }
  };

  // ── send message (SSE streaming) ──
  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming || !text.trim()) return;

      // 1. add user message
      const userMsg: ChatMessage = {
        id: msgId(),
        role: "user",
        content: text,
        sources: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // 2. add placeholder AI message
      const aiId = msgId();
      const aiPlaceholder: ChatMessage = {
        id: aiId,
        role: "assistant",
        content: "",
        sources: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiPlaceholder]);

      setIsStreaming(true);
      setStreamingContent("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            top_k: topK,
            temperature,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(errText || `HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        let sources: SourceCitation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "text") {
                fullContent += event.content;
                setStreamingContent(fullContent);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, content: fullContent } : m
                  )
                );
              } else if (event.type === "sources") {
                sources = event.sources || [];
              } else if (event.type === "error") {
                fullContent = "错误: " + (event.content || "未知错误");
                setStreamingContent(fullContent);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiId ? { ...m, content: fullContent } : m
                  )
                );
              }
              // "done" event — just continue, finalize after loop
            } catch {
              // skip unparseable lines
            }
          }
        }

        // finalize: attach sources
        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, sources } : m))
        );
        // auto-open sources for this message
        setOpenSources((prev) => ({ ...prev, [aiId]: true }));
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: "请求失败: " + (err.message || "未知错误") }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [isStreaming, topK, temperature]
  );

  // ── toggle source collapse ──
  const toggleSources = (msgId: string) => {
    setOpenSources((prev) => ({
      ...prev,
      [msgId]: !(prev[msgId] ?? true),
    }));
  };

  // ── render ──
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex h-full">
      {/* ═══════════ LEFT SIDEBAR ═══════════ */}
      <aside className="w-[360px] flex-shrink-0 bg-slate-800 flex flex-col h-full">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-blue-400" />
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight">
                MindLink AI
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                个人知识内化系统
              </p>
            </div>
          </div>
        </div>

        {/* File Upload */}
        <div className="p-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-blue-400 bg-blue-500/5"
                  : "border-slate-600 hover:border-slate-500 bg-slate-900"
              }
              ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">正在解析...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {isDragActive ? (
                  <Upload className="w-8 h-8 text-blue-400" />
                ) : (
                  <FileText className="w-8 h-8 text-slate-500" />
                )}
                <p className="text-sm text-slate-400">
                  {isDragActive ? "释放以上传文件" : "拖拽文件到此处上传"}
                </p>
                <p className="text-[11px] text-slate-600">
                  PDF · Markdown · TXT（最大 50MB）
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-hidden px-4 flex flex-col min-h-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-0.5">
            已索引文档 ({documents.length})
          </p>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {docsLoading && (
              <p className="text-xs text-slate-500 py-4 text-center">
                加载中...
              </p>
            )}
            {!docsLoading && documents.length === 0 && (
              <p className="text-xs text-slate-600 py-4 text-center">
                暂无文档，上传一个开始吧
              </p>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-start gap-2.5 bg-slate-900 rounded-lg px-3 py-2.5 border border-slate-700/30 group hover:border-slate-600/50 transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-200 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {doc.page_count ? `${doc.page_count} 页 · ` : ""}
                    {doc.chunk_count} 块
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 flex-shrink-0"
                  title="删除文档"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Model Params */}
        <div className="p-4 border-t border-slate-700/50">
          <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4 space-y-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              模型参数
            </p>

            {/* Top-K */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Top-K 检索深度</span>
                <span className="text-blue-400 font-medium">{topK}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Temperature</span>
                <span className="text-blue-400 font-medium">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
              />
            </div>

            {/* Model info */}
            {config && (
              <div className="pt-2 border-t border-slate-700/50">
                <p className="text-[10px] text-slate-600">
                  {config.llm_model} · {config.total_documents} 文档 ·{" "}
                  {config.total_chunks} 块
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════ RIGHT MAIN AREA ═══════════ */}
      <main className="flex-1 flex flex-col h-full bg-white min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">对话</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              基于 {config?.total_documents ?? 0} 个文档 ·{" "}
              {config?.total_chunks ?? 0} 个知识块
            </p>
          </div>
          <span className="text-[11px] text-blue-500 font-medium bg-blue-50 px-2.5 py-1 rounded-md">
            DeepSeek-R1
          </span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-4xl mb-3">
                <Brain className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-sm font-medium">MindLink AI 已就绪</p>
              <p className="text-xs mt-1">上传文档后开始对话</p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isSourcesOpen = openSources[msg.id] ?? true;

            return (
              <div key={msg.id} className="space-y-2">
                {/* ── User message ── */}
                {isUser && (
                  <div className="flex justify-end">
                    <div className="flex items-start gap-2 max-w-[75%] flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="bg-blue-50 rounded-2xl rounded-tr-md px-4 py-2.5">
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── AI message ── */}
                {!isUser && (
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 markdown-body text-sm text-slate-700 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: marked.parse(msg.content, {
                            breaks: true,
                          }) as string,
                        }}
                      />

                      {/* ── Sources ── */}
                      {msg.sources.length > 0 && (
                        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            参考来源 ({msg.sources.length})
                            <ChevronDown
                              className={`w-3.5 h-3.5 ml-auto transition-transform ${
                                isSourcesOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                          {isSourcesOpen && (
                            <div className="divide-y divide-slate-100">
                              {msg.sources.map((src, i) => (
                                <div
                                  key={i}
                                  className={`px-4 py-3 text-xs ${
                                    src.score < 0.6 ? "opacity-50" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-slate-800">
                                      {src.document_title}
                                    </span>
                                    {src.page_number && (
                                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                        第 {src.page_number} 页
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-500 line-clamp-2 leading-relaxed">
                                    {src.content}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-1">
                                    相关度: {src.score.toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Streaming indicator ── */}
          {isStreaming && streamingContent && (
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              </div>
              <div
                className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 markdown-body text-sm text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: marked.parse(streamingContent, {
                    breaks: true,
                  }) as string,
                }}
              />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(
              "message"
            ) as HTMLInputElement;
            if (input.value.trim() && !isStreaming) {
              handleSend(input.value.trim());
              input.value = "";
            }
          }}
          className="flex gap-2.5 px-6 py-4 border-t border-slate-100 flex-shrink-0"
        >
          <input
            name="message"
            placeholder="基于你的知识库提问..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:pointer-events-none bg-slate-800 text-white hover:bg-slate-700 text-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </main>
    </div>
  );
}
