"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, SourceCitation } from "@/lib/types";

const STORAGE_KEY = "mindlink-chat-history";
const MAX_STORED_MESSAGES = 50;

function msgId() {
  return crypto.randomUUID();
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    const toSave = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full or unavailable, silently ignore
  }
}

export function useChat(topK: number, temperature: number) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [openSources, setOpenSources] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null!);
  const isStreamingRef = useRef(false);

  // Load from localStorage on mount (client-side only, avoids hydration mismatch)
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    }
    setMessagesLoaded(true);
  }, []);

  // Persist to localStorage when messages change (only after streaming done)
  useEffect(() => {
    if (messagesLoaded && !isStreamingRef.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, messagesLoaded]);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // SSE streaming chat
  const handleSend = useCallback(
    async (text: string) => {
      if (isStreamingRef.current || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: msgId(),
        role: "user",
        content: text,
        sources: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

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
      isStreamingRef.current = true;
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
            } catch {
              // skip unparseable lines
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === aiId ? { ...m, sources } : m))
        );
        setOpenSources((prev) => ({ ...prev, [aiId]: true }));
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
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
        isStreamingRef.current = false;
        setStreamingContent("");
        abortRef.current = null;
      }
    },
    [topK, temperature]
  );

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const toggleSources = useCallback((msgId: string) => {
    setOpenSources((prev) => ({
      ...prev,
      [msgId]: !(prev[msgId] ?? true),
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setOpenSources({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    openSources,
    messagesEndRef,
    handleSend,
    stopGeneration,
    toggleSources,
    clearMessages,
  };
}
