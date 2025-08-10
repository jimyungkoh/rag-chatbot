import { Injectable } from '@nestjs/common';
import { ChromaClient } from 'chromadb';
import type {
  ChromaCollection,
  ChromaGetResult,
  ChromaQueryResult,
  IncludeKey,
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
    const res = await col.get({ limit, include: toIncludeEnums(inc) });
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
    if (embeddings && documents) {
      await col.add({ ids, embeddings, documents, metadatas });
    } else if (embeddings) {
      await col.add({ ids, embeddings, metadatas });
    } else if (documents) {
      await col.add({ ids, documents, metadatas });
    } else {
      throw new Error(
        'embeddings 또는 documents 중 하나는 반드시 제공해야 합니다.',
      );
    }
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
    const res = await col.query(
      queryEmbeddings && !queryTexts
        ? { queryEmbeddings, nResults, include: toIncludeEnums(inc) }
        : {
            queryTexts: queryTexts as string[],
            nResults,
            include: toIncludeEnums(inc),
          },
    );
    return res;
  }
}
