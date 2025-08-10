import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL,
  withCredentials: false,
});

export async function getCollections() {
  const { data } = await api.get<{ collections: string[] }>(`/chroma/collections`);
  return data.collections;
}

export async function createCollection(name: string) {
  const { data } = await api.post<{ name: string }>(`/chroma/collections`, { name });
  return data.name;
}

export interface QueryParams {
  name: string;
  limit?: number;
  include?: string[];
}

export async function getCollectionDocs(params: QueryParams) {
  const { name, limit, include } = params;
  const query = new URLSearchParams();
  if (limit) query.set("limit", String(limit));
  if (include && include.length) query.set("include", include.join(","));
  const { data } = await api.get(`/chroma/collections/${encodeURIComponent(name)}?${query.toString()}`);
  return data;
}

export async function addDocuments(name: string, payload: {
  ids: string[];
  embeddings?: number[][];
  documents?: string[];
  metadatas?: Array<Record<string, string | number | boolean>>;
}) {
  const { data } = await api.post(`/chroma/collections/${encodeURIComponent(name)}/add`, payload);
  return data as { added: number };
}
