"use client";

import { useState, type FormEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, isStreaming }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-2.5 px-6 py-4 border-t border-slate-100 flex-shrink-0"
    >
      <input
        name="message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="基于你的知识库提问..."
        disabled={isStreaming}
        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors disabled:bg-slate-50"
      />
      {isStreaming ? (
        <Button
          type="button"
          variant="destructive"
          size="default"
          onClick={onStop}
        >
          <Square className="w-4 h-4" />
        </Button>
      ) : (
        <Button type="submit" disabled={!text.trim()} size="default">
          <Send className="w-4 h-4" />
        </Button>
      )}
    </form>
  );
}
