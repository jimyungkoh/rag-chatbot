import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChromaService } from './chroma.service';

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
}
