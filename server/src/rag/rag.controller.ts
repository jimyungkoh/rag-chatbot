import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';

@Controller('rag')
export class RagController {
  private ragBaseURL: string;

  constructor(private readonly http: HttpService) {
    const host = process.env.RAG_ENGINE_HOST || 'rag-engine';
    const port = Number(process.env.RAG_ENGINE_PORT || 5050);
    this.ragBaseURL = `http://${host}:${port}`;
  }

  @Post('ingest')
  async ingest(
    @Body() body: { messages: string[]; metadata?: Record<string, unknown> },
  ) {
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      throw new BadRequestException('messages[] is required');
    }
    const resp = await firstValueFrom(
      this.http.post(`${this.ragBaseURL}/rag/ingest`, body),
    );
    return resp.data;
  }

  @Post('ingest-batch')
  @UseInterceptors(FileInterceptor('file'))
  async ingestBatch(
    @UploadedFile() file?: { originalname: string; buffer: Buffer },
  ) {
    if (!file || !file.buffer || !file.originalname) {
      throw new BadRequestException('file is required');
    }
    const name = file.originalname.toLowerCase();
    const text = file.buffer.toString('utf8');

    // 간단 유효성 검사 및 파싱
    let conversations: string[][] = [];
    if (name.endsWith('.txt')) {
      const lines = text
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (lines.length === 0) throw new BadRequestException('empty txt');
      conversations = [lines];
    } else if (name.endsWith('.jsonl')) {
      const lines = text
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter(Boolean);
      for (const ln of lines) {
        const obj = JSON.parse(ln);
        if (Array.isArray(obj)) conversations.push(obj);
        else if (Array.isArray(obj.messages)) conversations.push(obj.messages);
        else if (typeof obj.q === 'string' && typeof obj.a === 'string')
          conversations.push([`Q: ${obj.q}`, `A: ${obj.a}`]);
        else throw new BadRequestException('invalid jsonl line');
      }
    } else if (name.endsWith('.json')) {
      const obj = JSON.parse(text);
      if (Array.isArray(obj) && obj.every((x) => typeof x === 'string'))
        conversations = [obj as string[]];
      else if (Array.isArray(obj) && obj.every((x) => Array.isArray(x)))
        conversations = obj as string[][];
      else throw new BadRequestException('invalid json');
    } else {
      throw new BadRequestException(
        'unsupported file type (.txt/.json/.jsonl)',
      );
    }

    // 엔진에 순차 전송(간단 구현)
    const results: Array<{ id: string; vector_dim?: number }> = [];
    for (const messages of conversations) {
      const resp = await firstValueFrom(
        this.http.post(`${this.ragBaseURL}/rag/ingest`, {
          messages,
          metadata: { source: 'upload' },
        }),
      );
      results.push({ id: resp.data.id, vector_dim: resp.data.vector_dim });
    }
    return { count: results.length, items: results };
  }
}
