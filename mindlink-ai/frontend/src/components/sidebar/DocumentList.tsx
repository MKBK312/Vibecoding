"use client";

import { FileText, Trash2 } from "lucide-react";
import { useDocuments } from "@/hooks/useDocuments";

export function DocumentList() {
  const { documents, docsLoading, remove } = useDocuments();

  return (
    <div className="h-full flex flex-col">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-0.5">
        已索引文档 ({documents.length})
      </p>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {docsLoading && (
          <p className="text-xs text-slate-500 py-4 text-center">加载中...</p>
        )}
        {!docsLoading && documents.length === 0 && (
          <p className="text-xs text-slate-600 py-4 text-center">
            暂无文档，上传一个开始吧
          </p>
        )}
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-start gap-2.5 bg-slate-900 rounded-lg px-3 py-2.5 border border-slate-700/30 group hover:border-slate-600/50 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-slate-200 truncate">
                {doc.filename}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {doc.page_count ? `${doc.page_count} 页 · ` : ""}
                {doc.chunk_count} 块
              </p>
            </div>
            <button
              onClick={() => remove.mutate(doc.id)}
              disabled={remove.isPending}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5 flex-shrink-0 disabled:opacity-50"
              title="删除文档"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
