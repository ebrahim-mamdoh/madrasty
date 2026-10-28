"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, isServer } from "@tanstack/react-query";
import { isAppError, type AppErrorCode } from "@madrasty/core";

/** Retrying these never helps. */
const NON_RETRYABLE: AppErrorCode[] = ["forbidden", "unauthenticated", "not_found", "validation"];

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 2 && !(isAppError(error) && NON_RETRYABLE.includes(error.code)),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
