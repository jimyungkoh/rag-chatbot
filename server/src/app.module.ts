import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ChatModule } from '@/chat/chat.module';
import { ChromaModule } from '@/chroma/chroma.module';
import { RagModule } from '@/rag/rag.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    HttpModule.register({ timeout: 60000 }),
    ChromaModule,
    ChatModule,
    RagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
