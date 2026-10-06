import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Invalidate every API-backed query (dashboard, contacts, follow-ups, tags, notifications, interactions). */
export function useRefresh() {
  const qc = useQueryClient();
  return useCallback(
    () => qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/") }),
    [qc],
  );
}
