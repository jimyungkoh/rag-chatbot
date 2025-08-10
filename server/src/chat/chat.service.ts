import { ChromaService } from '@/chroma/chroma.service';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
type AxiosResponse<T> = { data: T };

interface AnswerParams {
  collection: string;
  question: string;
  top_k?: number;
  include?: string[];
}

@Injectable()
export class ChatService {
  private readonly ragBaseURL: string;

  constructor(
    private readonly http: HttpService,
    private readonly chroma: ChromaService,
  ) {
    const host = process.env.RAG_ENGINE_HOST || 'rag-engine';
    const port = Number(process.env.RAG_ENGINE_PORT || 5050);
    this.ragBaseURL = `http://${host}:${port}`;
  }

  async answer(params: AnswerParams) {
    const {
      collection,
      question,
      top_k = 5,
      include = ['documents', 'metadatas', 'distances'],
    } = params;

    // 1) 임베딩 (rag-engine HTTP)
    const embedResp = (await firstValueFrom(
      this.http.post<{ embeddings: number[][]; dimension?: number }>(
        `${this.ragBaseURL}/rag/embed`,
        {
          texts: [question],
        },
      ),
    )) as AxiosResponse<{ embeddings: number[][]; dimension?: number }>;
    const queryEmbeddings: number[][] = Array.isArray(
      embedResp.data?.embeddings,
    )
      ? embedResp.data.embeddings
      : [];

    // 2) Chroma 유사 검색
    const result = await this.chroma.queryCollection({
      name: collection,
      queryEmbeddings,
      nResults: top_k,
      include,
    });

    // 3) 간이 답변(LLM 없이) — 상위 문서 합성. 이후 OpenRouter 연결 예정
    const docs0 =
      Array.isArray(result.documents) && Array.isArray(result.documents[0])
        ? result.documents[0]
        : [];
    const topDocs = docs0.filter((d): d is string => typeof d === 'string');
    const context = topDocs.slice(0, 3).join('\n---\n');
    const answer = context
      ? `컨텍스트 기반 답변(베타):\n${context}`
      : '관련 문서를 찾지 못했습니다.';

    return {
      answer,
      contexts: (Array.isArray(result.ids) && Array.isArray(result.ids[0])
        ? (result.ids[0] as string[])
        : []
      ).map((id: string, i: number) => ({
        id,
        document:
          Array.isArray(result.documents) && Array.isArray(result.documents[0])
            ? (result.documents[0][i] ?? null)
            : null,
        metadata:
          Array.isArray(result.metadatas) && Array.isArray(result.metadatas[0])
            ? ((result.metadatas[0] as Array<Record<string, unknown> | null>)[
                i
              ] ?? null)
            : null,
        distance:
          Array.isArray(result.distances) && Array.isArray(result.distances[0])
            ? ((result.distances[0] as Array<number | null>)[i] ?? null)
            : null,
      })),
    };
  }
}
