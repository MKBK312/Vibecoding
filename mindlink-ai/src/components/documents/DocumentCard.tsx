'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Trash2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface DocumentCardProps {
  document: {
    id: string;
    title: string;
    source_type: string;
    chunk_count: number;
    summary?: string;
  };
}

export function DocumentCard({ document }: DocumentCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/summary/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to summarize');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <FileText className={`w-5 h-5 mt-0.5 ${document.source_type === 'pdf' ? 'text-red-500' : 'text-blue-500'}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-800 truncate">{document.title}</h4>
          <p className="text-xs text-gray-500 mt-1">
            {document.chunk_count} 个片段
          </p>
          {document.summary && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{document.summary}</p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => summarizeMutation.mutate(document.id)}
            className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
            title="生成摘要"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => deleteMutation.mutate(document.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
