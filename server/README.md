# RAG Chatbot - NestJS Server

RAG 기반 채팅 시스템의 NestJS 백엔드 서버입니다. ChromaDB 벡터 데이터베이스 제어와 RAG 엔진/LLM 호출을 통합하는 API 게이트웨이 역할을 담당합니다.

## 기술 스택

- **프레임워크**: NestJS
- **언어**: TypeScript
- **패키지 관리**: pnpm
- **HTTP 클라이언트**: Axios
- **검증**: class-validator, class-transformer
- **문서화**: Swagger/OpenAPI (추후 추가 예정)

## 시스템 아키텍처

서버는 클라이언트와 각종 백엔드 서비스 간의 단일 진입점 역할을 합니다:

```
client (Next.js)
    ↕ HTTP
server (NestJS) ← 현재 위치
    ↕ HTTP
├── rag-engine (FastAPI) - 임베딩/전처리
├── ChromaDB (Docker) - 벡터 저장소
└── OpenRouter API - LLM 서비스
```

## 주요 기능

### 🗂️ ChromaDB 관리
- 벡터 컬렉션 CRUD (생성, 조회, 삭제, 이름변경)
- 컬렉션 내 문서(벡터) 관리
- 메타데이터 기반 검색 및 필터링

### 🤖 RAG 파이프라인
- RAG 엔진을 통한 임베딩 생성
- 유사도 검색 기반 컨텍스트 추출
- OpenRouter를 통한 LLM 답변 생성

### 📤 배치 처리
- 대량 파일 업로드 및 인제스트
- JSON/JSONL/TXT 파일 포맷 지원
- 비동기 처리 및 진행률 추적

## 환경 설정

### 환경변수

`.env` 파일에 다음 환경변수를 설정하세요:

```bash
# 서버 설정
PORT=3001
CORS_ORIGIN=http://localhost:3000

# ChromaDB 연결
CHROMA_HOST=localhost
CHROMA_PORT=8000

# RAG 엔진 연결
RAG_ENGINE_URL=http://localhost:5050

# OpenRouter LLM 설정
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
```

### 필수 서비스

서버 실행 전 다음 서비스들이 먼저 실행되어야 합니다:

```bash
# ChromaDB 시작
docker compose up -d chromadb

# RAG 엔진 시작
docker compose up -d rag-engine
```

## 개발 환경 설정

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 모드 실행
pnpm start:dev

# 프로덕션 빌드
pnpm build
pnpm start:prod

# 테스트 실행
pnpm test
pnpm test:e2e
```

개발 서버: http://localhost:3001

## API 엔드포인트

### ChromaDB 컬렉션 관리

#### `GET /chroma/collections`
컬렉션 목록을 조회합니다.

**응답:**
```json
{
  "collections": ["support-docs", "product-info", "faq"]
}
```

#### `POST /chroma/collections`
새 컬렉션을 생성합니다.

**요청:**
```json
{
  "name": "new-collection"
}
```

**응답:**
```json
{
  "name": "new-collection"
}
```

#### `DELETE /chroma/collections/:name`
컬렉션을 삭제합니다.

**응답:**
```json
{
  "deleted": true
}
```

#### `POST /chroma/collections/:name/rename`
컬렉션 이름을 변경합니다.

**요청:**
```json
{
  "to": "renamed-collection"
}
```

**응답:**
```json
{
  "from": "old-name",
  "to": "renamed-collection"
}
```

### 컬렉션 데이터 관리

#### `GET /chroma/collections/:name`
컬렉션 내 문서를 조회합니다.

**쿼리 파라미터:**
- `limit`: 조회할 문서 수 (기본값: 100)
- `include`: 포함할 데이터 (`documents`, `metadatas`, `embeddings`, `distances`)

**응답:**
```json
{
  "ids": ["doc1", "doc2"],
  "documents": ["문서 내용 1", "문서 내용 2"],
  "metadatas": [{"source": "chat"}, {"source": "support"}]
}
```

#### `POST /chroma/collections/:name/add`
컬렉션에 문서를 추가합니다.

**요청:**
```json
{
  "ids": ["doc1"],
  "documents": ["새로운 문서 내용"],
  "metadatas": [{"source": "manual", "category": "faq"}]
}
```

**응답:**
```json
{
  "added": 1
}
```

#### `POST /chroma/collections/:name/query`
컬렉션에서 유사 문서를 검색합니다.

**요청:**
```json
{
  "queryEmbeddings": [[0.1, 0.2, 0.3, ...]],
  "nResults": 5,
  "include": ["documents", "metadatas", "distances"]
}
```

**응답:**
```json
{
  "ids": [["doc1", "doc2"]],
  "documents": [["관련 문서 1", "관련 문서 2"]],
  "metadatas": [[{"source": "chat"}, {"source": "support"}]],
  "distances": [[0.1, 0.3]]
}
```

#### `POST /chroma/collections/:name/delete`
컬렉션에서 특정 문서들을 삭제합니다.

**요청:**
```json
{
  "ids": ["doc1", "doc2"]
}
```

**응답:**
```json
{
  "deleted": 2
}
```

#### `GET /chroma/collections/:name/stats`
컬렉션 통계를 조회합니다.

**응답:**
```json
{
  "count": 1543,
  "dimension": 256
}
```

### RAG 인제스트

#### `POST /rag/ingest`
RAG 엔진을 통해 메시지를 전처리하고 임베딩을 생성합니다.

**요청:**
```json
{
  "messages": ["Q: 배송은 언제 되나요?", "A: 영업일 기준 2-3일 소요됩니다."],
  "metadata": {"source": "support-chat", "date": "2024-01-15"}
}
```

**응답:**
```json
{
  "id": "abc123",
  "text": "Q: 배송은 언제 되나요?\nA: 영업일 기준 2-3일 소요됩니다.",
  "vector_dim": 256
}
```

#### `POST /rag/ingest-batch`
파일 업로드를 통한 대량 인제스트를 처리합니다.

**요청:** `multipart/form-data`
- `file`: JSON/JSONL/TXT 파일
- `collection`: 대상 컬렉션명
- `source`: 메타데이터 소스 태그

**지원 파일 포맷:**
- **JSON**: `["msg1", "msg2", ...]` 또는 `[["msg1", "msg2"], ["msg3", "msg4"]]`
- **JSONL**: 한 줄당 하나의 대화 (JSON 배열 또는 객체)
- **TXT**: 줄바꿈으로 구분된 메시지

**응답:**
```json
{
  "count": 15,
  "items": [
    {"id": "...", "text": "...", "vector_dim": 256},
    ...
  ]
}
```

### RAG 질의응답

#### `POST /chat/answer`
선택된 컬렉션을 기반으로 RAG 답변을 생성합니다.

**요청:**
```json
{
  "collection": "support-docs",
  "question": "배송비는 얼마인가요?",
  "top_k": 5,
  "include": ["documents", "metadatas", "distances"]
}
```

**응답:**
```json
{
  "answer": "배송비는 주문 금액에 따라 다릅니다. 5만원 이상 주문 시 무료배송이며, 그 이하의 경우 3000원의 배송비가 부과됩니다.",
  "contexts": [
    {
      "id": "doc123",
      "document": "Q: 배송비 정책은? A: 5만원 이상 무료배송, 미만시 3000원",
      "metadata": {"source": "faq", "category": "shipping"},
      "distance": 0.12
    }
  ]
}
```

**처리 과정:**
1. RAG 엔진을 통한 질문 임베딩 생성
2. ChromaDB에서 유사 문서 검색 (top_k개)
3. 검색된 컨텍스트를 바탕으로 OpenRouter LLM 호출
4. 생성된 답변과 사용된 컨텍스트 반환

**오류 처리:**
- OpenRouter API 키가 없는 경우: 컨텍스트만 반환하고 답변은 "OpenRouter API 키가 필요합니다"
- LLM 호출 실패 시: 컨텍스트 문서들을 합성하여 폴백 답변 제공

## 프로젝트 구조

```
server/
├── src/
│   ├── app.module.ts           # 루트 모듈
│   ├── main.ts                 # 애플리케이션 진입점
│   ├── chroma/                 # ChromaDB 관련
│   │   ├── chroma.controller.ts
│   │   ├── chroma.service.ts
│   │   ├── chroma.module.ts
│   │   └── types.ts            # ChromaDB 타입 정의
│   ├── rag/                    # RAG 인제스트
│   │   ├── rag.controller.ts
│   │   └── rag.module.ts
│   └── chat/                   # RAG 질의응답
│       ├── chat.controller.ts
│       ├── chat.service.ts
│       └── chat.module.ts
├── test/                       # E2E 테스트
├── dist/                       # 빌드 결과
└── Dockerfile                  # 컨테이너 설정
```

## 모듈별 역할

### ChromaModule (`src/chroma/`)
- ChromaDB HTTP API와의 통신 담당
- 벡터 컬렉션 및 문서 CRUD 작업
- 타입 안전성 보장을 위한 DTO 및 응답 타입 정의

### RagModule (`src/rag/`)
- RAG 엔진과의 HTTP 통신
- 파일 업로드 및 배치 인제스트 처리
- 다양한 파일 포맷 파싱 및 검증

### ChatModule (`src/chat/`)
- RAG 기반 질의응답 오케스트레이션
- OpenRouter LLM API 호출
- 컨텍스트 합성 및 답변 생성

## Docker 배포

### 개발 환경
```bash
docker compose up server
```

### 프로덕션 환경
```bash
docker compose -f docker-compose.prod.yml up server
```

### 컨테이너 설정
- **포트**: 3001 (HTTP API)
- **종속성**: chromadb, rag-engine
- **환경변수**: Docker Compose를 통한 주입

## 에러 처리

### HTTP 상태 코드
- **200**: 성공
- **400**: 잘못된 요청 (validation 실패)
- **404**: 리소스 없음 (컬렉션/문서)
- **500**: 서버 내부 오류 (외부 서비스 연결 실패)

### 일반적인 오류 시나리오
- **ChromaDB 연결 실패**: 503 Service Unavailable
- **RAG 엔진 연결 실패**: 502 Bad Gateway  
- **OpenRouter API 실패**: 컨텍스트 합성으로 폴백
- **파일 업로드 오류**: 400 Bad Request (상세 오류 메시지 포함)

## 성능 최적화

### 캐싱 전략
- ChromaDB 컬렉션 목록 캐싱 (TTL: 5분)
- RAG 엔진 임베딩 결과 캐싱 (동일 텍스트)

### 배치 처리
- 대량 파일 업로드 시 청크 단위 처리
- 메모리 사용량 모니터링 및 제한

### 연결 풀링
- HTTP 클라이언트 연결 재사용
- 외부 서비스 타임아웃 설정

## 모니터링 및 로깅

### 로그 레벨
- **ERROR**: 서비스 장애, API 호출 실패
- **WARN**: 성능 저하, 폴백 실행
- **INFO**: 요청/응답 로그, 비즈니스 이벤트
- **DEBUG**: 상세 실행 과정 (개발 환경만)

### 주요 메트릭
- API 응답 시간
- 외부 서비스 호출 성공률
- 메모리 사용량
- 동시 처리 요청 수

## 개발 가이드

### 새 엔드포인트 추가
1. DTO 클래스 정의 (`*.dto.ts`)
2. 컨트롤러에 엔드포인트 추가
3. 서비스 로직 구현
4. E2E 테스트 작성

### 외부 서비스 연동
1. HTTP 클라이언트 설정
2. 응답 타입 정의
3. 에러 처리 및 폴백 로직
4. 연결 상태 헬스체크

### 검증 규칙 추가
```typescript
// class-validator 사용 예시
export class CreateCollectionDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;
}
```

## 테스트

### 단위 테스트
```bash
pnpm test            # 모든 테스트 실행
pnpm test:watch      # watch 모드
pnpm test:cov        # 커버리지 리포트
```

### E2E 테스트
```bash
pnpm test:e2e        # 통합 테스트 실행
```

### 테스트 환경 설정
- 테스트용 ChromaDB 인스턴스
- 모의(Mock) RAG 엔진 서버
- OpenRouter API 키 없이도 실행 가능

## 문제 해결

### 자주 발생하는 문제

**ChromaDB 연결 오류**
- `CHROMA_HOST`, `CHROMA_PORT` 환경변수 확인
- ChromaDB 컨테이너 상태 확인: `docker compose ps chromadb`

**RAG 엔진 연결 오류**
- `RAG_ENGINE_URL` 환경변수 확인
- RAG 엔진 컨테이너 상태 확인: `docker compose ps rag-engine`

**CORS 오류**
- `CORS_ORIGIN` 환경변수가 클라이언트 URL과 일치하는지 확인

**OpenRouter API 오류**
- `OPENROUTER_API_KEY` 설정 및 잔액 확인
- 모델명(`OPENROUTER_MODEL`) 정확성 확인

### 디버깅

```bash
# 로그 레벨 조정 (개발 환경)
NODE_ENV=development pnpm start:dev

# 외부 서비스 연결 상태 확인
curl http://localhost:3001/health  # (추후 추가 예정)

# 컨테이너 로그 확인
docker compose logs -f server
```

## 관련 문서

- [클라이언트 문서](../client/README.md)
- [RAG 엔진 문서](../rag-engine/README.md)
- [전체 시스템 아키텍처](../design-docs/frontend-architecture.md)
- [OpenRouter API 문서](https://openrouter.ai/docs)
- [ChromaDB API 문서](https://docs.trychroma.com/)