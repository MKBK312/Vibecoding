'use client';

import { useQuery } from '@tanstack/react-query';
import { Database, FileText, Pages, CheckCircle } from 'lucide-react';

async function fetchStats() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export function StatsPanel() {
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  });

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">📚 知识库状态</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">文档数:</span>
          <span className="font-medium text-gray-800">{data?.documentCount ?? 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Pages className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">总页数:</span>
          <span className="font-medium text-gray-800">{data?.totalPages ?? 0}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className={`w-4 h-4 ${data?.isReady ? 'text-green-500' : 'text-gray-300'}`} />
          <span className="text-gray-600">状态:</span>
          <span className={`font-medium ${data?.isReady ? 'text-green-600' : 'text-gray-400'}`}>
            {data?.isReady ? '✓ 就绪' : '○ 空闲'}
          </span>
        </div>
      </div>
    </div>
  );
}
