"use client";

import { Menu, Trash2 } from "lucide-react";
import { useConfig } from "@/hooks/useConfig";
import type { ChatMessage, SourceCitation } from "@/lib/types";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";

interface ChatHubProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  openSources: Record<string, boolean>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onSend: (text: string) => void;
  onStop: () => void;
  onToggleSources: (msgId: string) => void;
  onClear: () => void;
  onToggleSidebar: () => void;
}

export function ChatHub({
  messages,
  isStreaming,
  streamingContent,
  openSources,
  messagesEndRef,
  onSend,
  onStop,
  onToggleSources,
  onClear,
  onToggleSidebar,
}: ChatHubProps) {
  const { data: config } = useConfig();

  return (
    <main className="flex-1 flex flex-col h-full bg-white min-w-0">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="切换侧边栏"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">对话</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              知识库 "{config?.active_collection ?? "—"}" ·{" "}
              {config?.total_documents ?? 0} 文档 ·{" "}
              {config?.total_chunks ?? 0} 块
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
              title="清空对话"
            >
              <Trash2 className="w-3 h-3" />
              清空
            </button>
          )}
          <span className="text-[11px] text-blue-500 font-medium bg-blue-50 px-2.5 py-1 rounded-md">
            {config
              ? config.llm_backend === "claude"
                ? "Claude API"
                : config.llm_model
              : "—"}
          </span>
        </div>
      </header>

      {/* Messages */}
      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        openSources={openSources}
        messagesEndRef={messagesEndRef}
        onToggleSources={onToggleSources}
      />

      {/* Input */}
      <ChatInput onSend={onSend} onStop={onStop} isStreaming={isStreaming} />
    </main>
  );
}
