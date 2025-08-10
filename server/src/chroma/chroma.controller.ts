import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChromaService } from '@/chroma/chroma.service';

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
    const res = await this.chroma.getDocuments(name, lim, inc);
    return res;
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
      metadata?: Array<Record<string, string | number | boolean>>;
    },
  ) {
    const res = await this.chroma.addDocuments({ name, ...body });
    return res;
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
    const res = await this.chroma.queryCollection({ name, ...body });
    return res;
  }
}
