"use client";

import { Menu } from "lucide-react";
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
              基于 {config?.total_documents ?? 0} 个文档 ·{" "}
              {config?.total_chunks ?? 0} 个知识块
            </p>
          </div>
        </div>
        <span className="text-[11px] text-blue-500 font-medium bg-blue-50 px-2.5 py-1 rounded-md">
          {config
            ? config.llm_backend === "claude"
              ? "Claude API"
              : config.llm_model
            : "—"}
        </span>
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
