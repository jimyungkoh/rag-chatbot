import { Injectable } from '@nestjs/common';

type JSChromaClient = any;

@Injectable()
export class ChromaService {
  private client: JSChromaClient;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ChromaClient } = require('chromadb');
    const host = process.env.CHROMA_HOST || 'localhost';
    const port = Number(process.env.CHROMA_PORT || 8000);
    const path = `http://${host}:${port}`;
    this.client = new ChromaClient({ path });
  }

  async listCollections(): Promise<string[]> {
    const cols = await this.client.listCollections();
    return cols.map((c: any) => c.name ?? c);
  }

  async getCollection(name: string): Promise<any> {
    return await this.client.getCollection({ name });
  }

  async getDocuments(
    name: string,
    limit = 20,
    include?: string[],
  ): Promise<any> {
    const col = await this.getCollection(name);
    const allowed = ['documents', 'embeddings', 'metadatas', 'uris', 'data'];
    const inc =
      include && include.length
        ? include.filter((x) => allowed.includes(x))
        : ['documents', 'metadatas'];
    const res = await col.get({ limit, include: inc });
    return res;
  }
}
