import { QueryClient } from "@tanstack/react-query";

/**
 * アプリ全体で共有する QueryClient を生成
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
