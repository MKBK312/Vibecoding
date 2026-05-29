"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchConfig } from "@/lib/api";
import type { ConfigResponse } from "@/lib/types";

export function useConfig() {
  return useQuery<ConfigResponse>({
    queryKey: ["config"],
    queryFn: fetchConfig,
    staleTime: 30_000,
  });
}
