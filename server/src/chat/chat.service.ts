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
  private readonly openrouterApiKey?: string;
  private readonly openrouterBaseUrl: string;
  private readonly openrouterModel: string;

  constructor(
    private readonly http: HttpService,
    private readonly chroma: ChromaService,
  ) {
    const host = process.env.RAG_ENGINE_HOST || 'rag-engine';
    const port = Number(process.env.RAG_ENGINE_PORT || 5050);
    this.ragBaseURL = `http://${host}:${port}`;

    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || undefined;
    this.openrouterBaseUrl =
      process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.openrouterModel =
      process.env.OPENROUTER_MODEL || 'openai/gpt-5-nano';
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

    // 3) 컨텍스트 상위 문서 준비
    const docs0 =
      Array.isArray(result.documents) && Array.isArray(result.documents[0])
        ? result.documents[0]
        : [];
    const topDocs = docs0.filter((d): d is string => typeof d === 'string');
    const context = topDocs.slice(0, 3).join('\n---\n');

    // 4) OpenRouter 호출(키 없거나 실패하면 간이 답변 폴백)
    let answer: string;
    if (this.openrouterApiKey && context) {
      try {
        answer = await this.generateWithOpenRouter({ question, context });
      } catch {
        answer = `컨텍스트 기반 답변(베타):\n${context}`;
      }
    } else {
      answer = context
        ? `컨텍스트 기반 답변(베타):\n${context}`
        : '관련 문서를 찾지 못했습니다.';
    }

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

  private async generateWithOpenRouter(args: {
    question: string;
    context: string;
  }): Promise<string> {
    const { question, context } = args;
    const url = `${this.openrouterBaseUrl}/chat/completions`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.openrouterApiKey as string}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'rag-chatbot-server',
    };
    const systemPrompt =
      '당신은 RAG 시스템의 어시스턴트입니다. 제공된 컨텍스트만 활용해 한국어로 간결하고 정확한 답변을 작성하세요. ' +
      '컨텍스트에 근거가 없으면 모른다고 답하세요. 불필요한 서론 없이 바로 핵심만 답하세요.';

    const payload = {
      model: this.openrouterModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `질문:\n${question}\n\n` +
            `컨텍스트(필수 근거, 최대 3개 문서):\n${context}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    };

    const resp = (await firstValueFrom(
      this.http.post<{ choices: Array<{ message: { content: string } }> }>(
        url,
        payload,
        { headers },
      ),
    )) as AxiosResponse<{ choices: Array<{ message: { content: string } }> }>;
    const content = resp.data?.choices?.[0]?.message?.content?.trim();
    return content || '답변을 생성하지 못했습니다.';
  }
}
