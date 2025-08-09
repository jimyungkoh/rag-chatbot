import { Module } from '@nestjs/common';
import { ChromaController } from './chroma.controller';
import { ChromaService } from './chroma.service';

@Module({
  providers: [ChromaService],
  controllers: [ChromaController],
  exports: [ChromaService],
})
export class ChromaModule {}
