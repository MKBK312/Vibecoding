"use client";

import { Brain, Loader2 } from "lucide-react";
import { marked } from "marked";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  openSources: Record<string, boolean>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onToggleSources: (msgId: string) => void;
}

export function ChatMessages({
  messages,
  isStreaming,
  streamingContent,
  openSources,
  messagesEndRef,
  onToggleSources,
}: ChatMessagesProps) {
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
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

      {messages.map((msg) => (
        <div key={msg.id} className="space-y-2">
          <MessageBubble
            message={msg}
            isSourcesOpen={openSources[msg.id] ?? true}
            onToggleSources={() => onToggleSources(msg.id)}
          />
        </div>
      ))}

      {/* Streaming indicator */}
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
  );
}
