"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, Library } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchKnowledgeBases,
  createKnowledgeBase,
  switchKnowledgeBase,
} from "@/lib/api";
import type { KnowledgeBaseInfo } from "@/lib/types";

interface KnowledgeBaseSelectorProps {
  activeCollection: string;
  collections: string[];
}

export function KnowledgeBaseSelector({
  activeCollection,
  collections,
}: KnowledgeBaseSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSwitch = async (name: string) => {
    try {
      await switchKnowledgeBase(name);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      setOpen(false);
      toast.success(`已切换到 "${name}"`);
    } catch (err: any) {
      toast.error("切换失败", { description: err.message });
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createKnowledgeBase(name);
      await handleSwitch(name);
      setShowCreate(false);
      setNewName("");
      toast.success(`知识库 "${name}" 已创建`);
    } catch (err: any) {
      toast.error("创建失败", { description: err.message });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700/50 rounded-lg text-xs text-slate-300 hover:border-slate-600 transition-colors"
      >
        <Library className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <span className="flex-1 text-left truncate">{activeCollection}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700/50 rounded-lg overflow-hidden z-40 shadow-xl">
          <div className="max-h-40 overflow-y-auto py-1">
            {collections.map((name) => (
              <button
                key={name}
                onClick={() => handleSwitch(name)}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                  ${
                    name === activeCollection
                      ? "text-blue-400 bg-blue-500/10 font-medium"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-700/50 p-1.5">
            {showCreate ? (
              <div className="flex gap-1">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="知识库名称..."
                  className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  创建
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                新建知识库
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
