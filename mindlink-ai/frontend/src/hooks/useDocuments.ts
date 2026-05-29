"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchDocuments, deleteDocument } from "@/lib/api";

export function useDocuments() {
  const queryClient = useQueryClient();

  const {
    data: documents = [],
    isLoading: docsLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
  });

  const remove = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("已删除", {
        description: `共删除 ${data.deleted_chunks} 个文本块`,
      });
    },
    onError: (err: Error) => {
      toast.error("删除失败", { description: err.message });
    },
  });

  return { documents, docsLoading, isError, error, remove };
}
