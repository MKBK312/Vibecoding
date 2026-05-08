'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { SourceCitation } from '@/lib/types';

interface SourceCitationsProps {
  sources: SourceCitation[];
}

export function SourceCitations({ sources }: SourceCitationsProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="ml-11 mt-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        <FileText className="w-4 h-4" />
        <span>📄 参考来源 ({sources.length})</span>
      </button>

      {!isCollapsed && (
        <div className="mt-2 space-y-2">
          {sources.map((source, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-700">
                  {source.document_title}
                  {source.page_number && `, p.${source.page_number}`}
                </span>
                <span className="text-xs text-gray-400">
                  相关度: {Math.round(source.score * 100)}%
                </span>
              </div>
              <p className="text-gray-600 text-xs line-clamp-3">{source.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
