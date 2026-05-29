"use client";

import { Brain, X } from "lucide-react";
import { FileUploader } from "./FileUploader";
import { DocumentList } from "./DocumentList";
import { ModelParams } from "./ModelParams";
import { KnowledgeBaseSelector } from "./KnowledgeBaseSelector";
import { useConfig } from "@/hooks/useConfig";

interface SidebarProps {
  topK: number;
  temperature: number;
  onTopKChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Sidebar({
  topK,
  temperature,
  onTopKChange,
  onTemperatureChange,
  sidebarOpen,
  onToggleSidebar,
}: SidebarProps) {
  const { data: config } = useConfig();
  return (
    <aside
      className={`w-[360px] flex-shrink-0 bg-slate-800 flex flex-col h-full
        fixed inset-y-0 left-0 z-30
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:static lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50 flex items-center justify-between">
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
        {/* Close button (mobile/tablet only) */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="关闭侧边栏"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Knowledge Base Selector */}
      {config && (
        <div className="px-4 pt-4">
          <KnowledgeBaseSelector
            activeCollection={config.active_collection}
            collections={config.collections}
          />
        </div>
      )}

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
