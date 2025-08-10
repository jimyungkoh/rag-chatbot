import { Injectable } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import type {
  ChromaCollection,
  ChromaGetResult,
  ChromaQueryResult,
  IncludeKey,
  ChromaAddParams,
} from './types';
import { toIncludeEnums } from './types';

@Injectable()
export class ChromaService {
  private client: ChromaClient;

  constructor() {
    const host = process.env.CHROMA_HOST || 'localhost';
    const port = Number(process.env.CHROMA_PORT || 8000);
    const path = `http://${host}:${port}`;
    this.client = new ChromaClient({ path });
  }

  async listCollections(): Promise<string[]> {
    return await this.client.listCollections();
  }

  async getCollection(name: string): Promise<ChromaCollection> {
    return await this.client.getOrCreateCollection({ name });
  }

  async getDocuments(
    name: string,
    limit = 20,
    include?: string[],
  ): Promise<ChromaGetResult> {
    const col = await this.getCollection(name);
    const allowed: IncludeKey[] = [
      'documents',
      'embeddings',
      'metadatas',
      'distances',
    ];
    const inc: IncludeKey[] =
      include && include.length
        ? include.filter((x): x is IncludeKey =>
            (allowed as readonly string[]).includes(x),
          )
        : ['documents', 'metadatas'];

    const includeEnums = toIncludeEnums(inc);
    const getParams = includeEnums
      ? { limit, include: includeEnums }
      : { limit };

    const res = await col.get(getParams);
    return res;
  }

  async createCollection(name: string): Promise<{ name: string }> {
    await this.client.createCollection({ name });
    return { name };
  }

  async addDocuments(args: {
    name: string;
    ids: string[];
    embeddings?: number[][];
    documents?: string[];
    metadatas?: Array<Record<string, string | number | boolean>>;
  }): Promise<{ added: number }> {
    const { name, ids, embeddings, documents, metadatas } = args;
    const col = await this.getCollection(name);

    if (!embeddings && !documents) {
      throw new Error(
        'embeddings 또는 documents 중 하나는 반드시 제공해야 합니다.',
      );
    }

    const addParams: Partial<ChromaAddParams> = { ids };

    if (embeddings) {
      addParams.embeddings = embeddings;
    }
    if (documents) {
      addParams.documents = documents;
    }
    if (metadatas) {
      addParams.metadatas = metadatas;
    }

    await col.add(addParams as ChromaAddParams);
    return { added: ids.length };
  }

  async queryCollection(args: {
    name: string;
    queryEmbeddings?: number[][];
    queryTexts?: string[];
    nResults?: number;
    include?: string[];
  }): Promise<ChromaQueryResult> {
    const { name, queryEmbeddings, queryTexts, nResults, include } = args;
    const col = await this.getCollection(name);
    const allowed: IncludeKey[] = [
      'documents',
      'embeddings',
      'metadatas',
      'distances',
    ];
    const inc: IncludeKey[] | undefined = include?.filter(
      (x): x is IncludeKey => (allowed as readonly string[]).includes(x),
    );

    if (!queryEmbeddings && !queryTexts) {
      throw new Error(
        'queryEmbeddings 또는 queryTexts 중 하나는 반드시 제공해야 합니다.',
      );
    }

    const includeEnums = toIncludeEnums(inc);

    // Build query parameters based on query type (embeddings or texts, but not both)
    let queryParams;

    if (queryEmbeddings && !queryTexts) {
      queryParams = {
        queryEmbeddings,
        ...(nResults !== undefined && { nResults }),
        ...(includeEnums && { include: includeEnums }),
      };
    } else if (queryTexts) {
      queryParams = {
        queryTexts,
        ...(nResults !== undefined && { nResults }),
        ...(includeEnums && { include: includeEnums }),
      };
    } else {
      throw new Error('유효한 query 파라미터가 없습니다.');
    }

    const res = await col.query(queryParams);
    return res;
  }
}
