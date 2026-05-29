"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { User, Bot } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { SourceCard } from "./SourceCard";

interface MessageBubbleProps {
  message: ChatMessage;
  isSourcesOpen: boolean;
  onToggleSources: () => void;
}

export function MessageBubble({
  message,
  isSourcesOpen,
  onToggleSources,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  const html = useMemo(() => {
    if (isUser) return null;
    return marked.parse(message.content, { breaks: true }) as string;
  }, [message.content, isUser]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="flex items-start gap-2 max-w-[75%] flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="bg-blue-50 rounded-2xl rounded-tr-md px-4 py-2.5">
            <p className="text-sm text-blue-900 whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-slate-600" />
      </div>
      <div className="min-w-0">
        <div
          className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3 markdown-body text-sm text-slate-700 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html ?? "" }}
        />

        {message.sources.length > 0 && (
          <SourceCard
            sources={message.sources}
            isOpen={isSourcesOpen}
            onToggle={onToggleSources}
          />
        )}
      </div>
    </div>
  );
}
