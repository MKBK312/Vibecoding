"use client";

import { ChevronDown, FileText } from "lucide-react";
import type { SourceCitation } from "@/lib/types";

interface SourceCardProps {
  sources: SourceCitation[];
  isOpen: boolean;
  onToggle: () => void;
}

export function SourceCard({ sources, isOpen, onToggle }: SourceCardProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-600"
      >
        <FileText className="w-3.5 h-3.5" />
        参考来源 ({sources.length})
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="divide-y divide-slate-100">
          {sources.map((src, i) => (
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
  );
}
