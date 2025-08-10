export type IncludeKey = "documents" | "embeddings" | "metadatas" | "distances";

export interface ChromaGetResult {
  ids: string[];
  documents?: (string | null)[];
  metadatas?: Record<string, unknown>[];
  embeddings?: number[][];
  distances?: number[];
}

export interface ChromaQueryResult {
  ids: string[][];
  documents?: (string | null)[][];
  metadatas?: Record<string, unknown>[][];
  distances?: number[][];
}
