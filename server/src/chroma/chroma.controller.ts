import { ChromaService } from '@/chroma/chroma.service';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

@Controller('chroma')
export class ChromaController {
  constructor(private readonly chroma: ChromaService) {}

  @Get('collections')
  async collections() {
    const list = await this.chroma.listCollections();
    return { collections: list };
  }

  @Get('collections/:name')
  async collection(
    @Param('name') name: string,
    @Query('limit') limit?: string,
    @Query('include') include?: string,
  ) {
    const lim = Number(limit || 20);
    const inc = include ? include.split(',').map((s) => s.trim()) : undefined;

    return this.chroma.getDocuments(name, lim, inc);
  }

  @Post('collections')
  async createCollection(@Body('name') name: string) {
    return await this.chroma.createCollection(name);
  }

  @Post('collections/:name/add')
  async add(
    @Param('name') name: string,
    @Body()
    body: {
      ids: string[];
      embeddings?: number[][];
      documents?: string[];
      metadatas?: Array<Record<string, string | number | boolean>>;
    },
  ) {
    const addData: {
      name: string;
      ids: string[];
      embeddings?: number[][];
      documents?: string[];
      metadatas?: Array<Record<string, string | number | boolean>>;
    } = {
      name,
      ids: body.ids,
    };

    if (body.embeddings) {
      addData.embeddings = body.embeddings;
    }
    if (body.documents) {
      addData.documents = body.documents;
    }
    if (body.metadatas) {
      addData.metadatas = body.metadatas;
    }

    return this.chroma.addDocuments(addData);
  }

  @Post('collections/:name/query')
  async query(
    @Param('name') name: string,
    @Body()
    body: {
      queryEmbeddings?: number[][];
      queryTexts?: string[];
      nResults?: number;
      include?: string[];
    },
  ) {
    const queryData: {
      name: string;
      queryEmbeddings?: number[][];
      queryTexts?: string[];
      nResults?: number;
      include?: string[];
    } = {
      name,
    };

    if (body.queryEmbeddings) {
      queryData.queryEmbeddings = body.queryEmbeddings;
    }
    if (body.queryTexts) {
      queryData.queryTexts = body.queryTexts;
    }
    if (body.nResults) {
      queryData.nResults = body.nResults;
    }
    if (body.include) {
      queryData.include = body.include;
    }

    return this.chroma.queryCollection(queryData);
  }
}
