"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";

export function FileUploader() {
  const { upload, isUploading } = useUpload();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        await upload(file);
      }
    },
    [upload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/markdown": [".md"],
      "text/plain": [".txt"],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${
          isDragActive
            ? "border-blue-400 bg-blue-500/5"
            : "border-slate-600 hover:border-slate-500 bg-slate-900"
        }
        ${isUploading ? "pointer-events-none opacity-60" : ""}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">正在解析...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {isDragActive ? (
            <Upload className="w-8 h-8 text-blue-400" />
          ) : (
            <FileText className="w-8 h-8 text-slate-500" />
          )}
          <p className="text-sm text-slate-400">
            {isDragActive ? "释放以上传文件" : "拖拽文件到此处上传"}
          </p>
          <p className="text-[11px] text-slate-600">
            PDF · Markdown · TXT（最大 50MB）
          </p>
        </div>
      )}
    </div>
  );
}
