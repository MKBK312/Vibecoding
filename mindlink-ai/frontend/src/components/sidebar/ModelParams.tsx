"use client";

import { useConfig } from "@/hooks/useConfig";
import type { ConfigResponse } from "@/lib/types";

interface ModelParamsProps {
  topK: number;
  temperature: number;
  onTopKChange: (value: number) => void;
  onTemperatureChange: (value: number) => void;
  config?: ConfigResponse;
}

export function ModelParams({
  topK,
  temperature,
  onTopKChange,
  onTemperatureChange,
}: ModelParamsProps) {
  const { data: config } = useConfig();

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700/50 p-4 space-y-4">
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        模型参数
      </p>

      {/* Top-K */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Top-K 检索深度</span>
          <span className="text-blue-400 font-medium">{topK}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={topK}
          onChange={(e) => onTopKChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
        />
      </div>

      {/* Temperature */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Temperature</span>
          <span className="text-blue-400 font-medium">
            {temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-lg"
        />
      </div>

      {/* Model info */}
      {config && (
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-600">
            {config.llm_model} · {config.total_documents} 文档 ·{" "}
            {config.total_chunks} 块
          </p>
        </div>
      )}
    </div>
  );
}
