import type {
  AddRecordsParams,
  ChromaClient,
  Collection,
  GetResponse,
  QueryResponse,
} from 'chromadb';
import { IncludeEnum } from 'chromadb';

export type ChromaClientInstance = ChromaClient;
export type ChromaCollection = Collection;
export type ChromaGetResult = GetResponse;
export type ChromaQueryResult = QueryResponse;
export type ChromaAddParams = AddRecordsParams;
// re-export IncludeEnum values
export { IncludeEnum };

export type IncludeKey = 'documents' | 'embeddings' | 'metadatas' | 'distances';

export function toIncludeEnums(keys?: IncludeKey[]): IncludeEnum[] | undefined {
  if (!keys || keys.length === 0) return undefined;
  const map: Record<IncludeKey, IncludeEnum> = {
    documents: IncludeEnum.Documents,
    embeddings: IncludeEnum.Embeddings,
    metadatas: IncludeEnum.Metadatas,
    distances: IncludeEnum.Distances,
  };
  return keys.map((k) => map[k]);
}
