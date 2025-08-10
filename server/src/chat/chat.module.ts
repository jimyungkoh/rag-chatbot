import { Module } from '@nestjs/common';
import { ChatService } from '@/chat/chat.service';
import { ChatController } from '@/chat/chat.controller';
import { HttpModule } from '@nestjs/axios';
import { ChromaModule } from '@/chroma/chroma.module';

@Module({
  imports: [HttpModule, ChromaModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
