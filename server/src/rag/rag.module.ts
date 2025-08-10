import { RagController } from '@/rag/rag.controller';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [HttpModule],
  controllers: [RagController],
})
export class RagModule {}
