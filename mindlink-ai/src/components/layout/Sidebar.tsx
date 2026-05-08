'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import { FileUploader } from '@/components/documents/FileUploader';
import { StatsPanel } from '@/components/documents/StatsPanel';
import { DocumentList } from '@/components/documents/DocumentList';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SettingsModal } from '@/components/layout/SettingsModal';
import { DEFAULT_TOP_K, MIN_TOP_K, MAX_TOP_K } from '@/lib/constants';

const TOP_K_OPTIONS = Array.from({ length: MAX_TOP_K - MIN_TOP_K + 1 }, (_, i) => ({
  value: String(i + MIN_TOP_K),
  label: String(i + MIN_TOP_K),
}));

export function Sidebar() {
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <aside className="w-72 h-screen border-r bg-gray-50 flex flex-col">
        {/* 顶部上传区域 */}
        <div className="p-4 border-b border-gray-200">
          <FileUploader />
        </div>

        {/* 知识库状态 */}
        <div className="p-4 border-b border-gray-200">
          <StatsPanel />
        </div>

        {/* 模型参数 */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">⚙️ 模型参数</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Top-K</span>
              <Select
                options={TOP_K_OPTIONS}
                value={String(topK)}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Embedding</span>
              <span className="text-gray-800">bge-small-zh</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">LLM</span>
              <span className="text-gray-800">Claude</span>
            </div>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">📄 文档列表</h3>
          <DocumentList />
        </div>

        {/* 设置按钮 */}
        <div className="p-4 border-t border-gray-200">
          <Button variant="outline" className="w-full" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            设置
          </Button>
        </div>
      </aside>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
