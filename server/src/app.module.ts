import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { ChromaModule } from '@/chroma/chroma.module';

@Module({
  imports: [ChromaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
