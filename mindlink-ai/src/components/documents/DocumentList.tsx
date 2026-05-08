'use client';

import { useQuery } from '@tanstack/react-query';
import { DocumentCard } from './DocumentCard';

async function fetchDocuments() {
  const res = await fetch('/api/documents');
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export function DocumentList() {
  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: fetchDocuments,
  });

  if (isLoading) {
    return <div className="text-sm text-gray-400">加载中...</div>;
  }

  if (!data?.documents || data.documents.length === 0) {
    return <div className="text-sm text-gray-400">暂无文档，上传文件开始</div>;
  }

  return (
    <div className="space-y-2">
      {data.documents.map((doc: { id: string; title: string; source_type: string; chunk_count: number; summary?: string }) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
