import { Module } from '@nestjs/common';
import { ChromaController } from '@/chroma/chroma.controller';
import { ChromaService } from '@/chroma/chroma.service';

@Module({
  providers: [ChromaService],
  controllers: [ChromaController],
  exports: [ChromaService],
})
export class ChromaModule {}
