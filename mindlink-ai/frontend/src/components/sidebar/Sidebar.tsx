"use client";

import { Brain } from "lucide-react";
import { FileUploader } from "./FileUploader";
import { DocumentList } from "./DocumentList";
import { ModelParams } from "./ModelParams";

interface SidebarProps {
  topK: number;
  temperature: number;
  onTopKChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
}

export function Sidebar({
  topK,
  temperature,
  onTopKChange,
  onTemperatureChange,
}: SidebarProps) {
  return (
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
        <FileUploader />
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-hidden px-4 flex flex-col min-h-0">
        <DocumentList />
      </div>

      {/* Model Params */}
      <div className="p-4 border-t border-slate-700/50">
        <ModelParams
          topK={topK}
          temperature={temperature}
          onTopKChange={onTopKChange}
          onTemperatureChange={onTemperatureChange}
        />
      </div>
    </aside>
  );
}
