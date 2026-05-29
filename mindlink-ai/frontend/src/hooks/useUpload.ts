"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { uploadDocument } from "@/lib/api";

export function useUpload() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("上传成功", {
        description: `${data.filename} · ${data.chunk_count} 个文本块`,
      });
    },
    onError: (err: Error) => {
      toast.error("上传失败", { description: err.message });
    },
  });

  return {
    upload: mutation.mutateAsync,
    isUploading: mutation.isPending,
  };
}
