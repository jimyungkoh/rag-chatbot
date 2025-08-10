# RAG Chatbot

## 시스템 목적

- **ChromaDB 벡터 데이터베이스**를 통한 효율적인 문서 임베딩 저장 및 검색
- **RAG 엔진**을 활용한 고품질 텍스트 임베딩 생성 및 전처리
- **OpenRouter LLM API** 연동을 통한 지능적인 답변 생성
- **직관적인 웹 인터페이스**로 모든 기능에 쉽게 접근
- **확장 가능한 아키텍처**로 향후 기능 추가 및 성능 개선 지원

---

## 시스템 아키텍처

### 전체 구조도

```
┌─────────────────┐    HTTP     ┌─────────────────┐
│                 │ ◄──────────► │                 │
│  Client         │  Port 3000   │  Server         │
│  (Next.js)      │              │  (NestJS)       │
│                 │              │                 │
└─────────────────┘              └─────────────────┘
                                          │
                                          │ HTTP
                                          ▼
                          ┌─────────────────────────────────┐
                          │                                 │
                          │  Backend Services Layer        │
                          │                                 │
                          │  ┌─────────────┐                │
                          │  │ RAG Engine  │  Port 5050     │
                          │  │ (FastAPI)   │ ◄─────────┐    │
                          │  └─────────────┘           │    │
                          │         │                  │    │
                          │         │ HTTP             │    │
                          │         ▼                  │    │
                          │  ┌─────────────┐           │    │
                          │  │  ChromaDB   │  Port 8000│    │
                          │  │  (Docker)   │ ◄─────────┼────┤
                          │  └─────────────┘           │    │
                          │                            │    │
                          │  ┌─────────────┐           │    │
                          │  │ OpenRouter  │ ◄─────────┘    │
                          │  │    API      │                │
                          │  └─────────────┘                │
                          │                                 │
                          └─────────────────────────────────┘
```

### 서비스별 역할

#### **Client (Frontend)**

- **프레임워크**: Next.js 15 with App Router
- **역할**: 사용자 인터페이스 제공 및 서버 API 호출
- **주요 기능**:
  - ChromaDB 컬렉션 관리 UI
  - RAG Playground (질의응답 인터페이스)
  - 배치 파일 업로드 및 인제스트
  - 실시간 상태 모니터링

#### **Server (API Gateway)**

- **프레임워크**: NestJS with TypeScript
- **역할**: 모든 백엔드 서비스의 단일 진입점
- **주요 기능**:
  - ChromaDB CRUD API 중계
  - RAG 엔진 호출 및 응답 처리
  - OpenRouter LLM API 통합
  - 인증, 검증, 에러 처리

#### **RAG Engine (AI Processing)**

- **프레임워크**: FastAPI with Python
- **역할**: 텍스트 임베딩 생성 및 전처리
- **주요 기능**:
  - 다국어 임베딩 모델 (Potion/Sentence-Transformers)
  - OpenRouter 기반 텍스트 전처리 (선택적)
  - 배치 인제스트 처리
  - CLI 및 HTTP API 제공

#### **ChromaDB (Vector Database)**

- **환경**: Docker Container
- **역할**: 벡터 임베딩 저장 및 유사도 검색
- **주요 기능**:
  - 고성능 벡터 검색
  - 메타데이터 기반 필터링
  - 컬렉션별 데이터 관리

---

## 서비스 간 협력 구조

### 1. 데이터 인제스트 플로우

```
사용자 텍스트/파일 입력
        ↓
Client: 업로드 UI
        ↓
Server: 파일 파싱 & 검증
        ↓
RAG Engine: 텍스트 전처리 & 임베딩 생성
        ↓
ChromaDB: 벡터 저장
        ↓
Client: 결과 표시 (성공/실패, 통계)
```

**주요 협력 포인트**:

- Server는 다양한 파일 포맷(JSON/JSONL/TXT)을 파싱
- RAG Engine은 Q/A 패턴으로 텍스트를 정규화
- ChromaDB는 메타데이터와 함께 벡터를 저장
- Client는 실시간 진행률 및 결과를 표시

### 2. RAG 질의응답 플로우

```
사용자 질문 입력
        ↓
Client: 질문 전송 & 컬렉션 선택
        ↓
Server: 질문 수신 & RAG 엔진 호출
        ↓
RAG Engine: 질문 임베딩 생성
        ↓
ChromaDB: 유사도 검색 (Top-K 문서)
        ↓
Server: 컨텍스트 + 질문으로 OpenRouter LLM 호출
        ↓
Client: 답변 + 컨텍스트 문서 표시
```

**주요 협력 포인트**:

- Client는 실시간으로 답변을 스트리밍 표시
- Server는 OpenRouter API 실패 시 컨텍스트 합성으로 폴백
- RAG Engine의 임베딩 결과는 캐싱되어 성능 최적화
- ChromaDB 검색 결과에는 거리값과 메타데이터 포함

### 3. 컬렉션 관리 플로우

```
컬렉션 CRUD 요청
        ↓
Client: 관리 UI (생성/조회/삭제/이름변경)
        ↓
Server: ChromaDB API 직접 호출
        ↓
ChromaDB: 컬렉션 메타데이터 조작
        ↓
Client: 업데이트된 상태 반영
```

**주요 협력 포인트**:

- Server는 ChromaDB HTTP API를 직접 호출
- Client는 TanStack Query로 상태를 캐싱
- 실시간 UI 업데이트로 일관성 유지

---

## 기술 스택 상세

### Frontend (Client)

```typescript
// 핵심 기술 스택
Next.js 15 (App Router)     // SSR/ISR, 파일 기반 라우팅
TypeScript                  // 타입 안전성
Tailwind CSS v4            // 스타일링 및 반응형 디자인
shadcn/ui                   // 접근성 친화적 UI 컴포넌트

// 상태 관리
TanStack Query             // 서버 상태 캐싱 및 동기화
Zustand                    // 경량 클라이언트 상태

// 폼 & 검증
react-hook-form            // 성능 최적화된 폼 처리
Zod                        // 런타임 타입 검증

// 개발 도구
pnpm                       // 패키지 매니저
ESLint + Prettier          // 코드 품질 및 포매팅
```

### Backend (Server)

```typescript
// 핵심 프레임워크
NestJS                     // 모듈화된 서버 아키텍처
TypeScript                 // 타입 안전성

// HTTP & API
Axios                      // HTTP 클라이언트
class-validator            // DTO 검증
class-transformer          // 데이터 변환

// 개발 도구
Jest                       // 단위 테스트
pnpm                       // 패키지 매니저
```

### AI Processing (RAG Engine)

```python
# 핵심 프레임워크
FastAPI                    # 고성능 API 서버
Pydantic                   # 데이터 검증

# AI/ML
model2vec                  # Potion 임베딩 모델
sentence-transformers      # 폴백 임베딩 모델
openai                     # OpenRouter API 클라이언트

# 데이터 처리
chromadb                   # 벡터 데이터베이스 클라이언트
nanoid                     # 고유 ID 생성

# CLI
click                      # 명령줄 인터페이스
```

---

## 환경 설정 및 실행

### 개발 환경 시작

```bash
# 1. ChromaDB 시작 (필수)
docker compose up -d chromadb

# 2. RAG 엔진 시작
cd rag-engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn rag_engine.server:app --host 0.0.0.0 --port 5050

# 3. 서버 시작
cd server
pnpm install
pnpm start:dev

# 4. 클라이언트 시작
cd client
pnpm install
pnpm dev
```

### 환경변수 설정

**Client (.env.local)**:

```bash
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:3001
```

**Server (.env)**:

```bash
PORT=3001
CORS_ORIGIN=http://localhost:3000
CHROMA_HOST=localhost
CHROMA_PORT=8000
RAG_ENGINE_URL=http://localhost:5050
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4o-mini
```

**RAG Engine (.env)**:

```bash
OPENROUTER_API_KEY=your_api_key_here
EMBEDDING_MODEL_ID=minishlab/potion-multilingual-128M
CHROMA_HOST=localhost
CHROMA_PORT=8000
DEFAULT_TOP_K=5
```

### Docker 배포

```bash
# 개발 환경
docker compose up -d

# 프로덕션 환경
docker compose -f docker-compose.prod.yml up -d
```

---

## API 레퍼런스 요약

### Client → Server API

| 엔드포인트                      | 메소드     | 목적             | 상세 문서                                                |
| ------------------------------- | ---------- | ---------------- | -------------------------------------------------------- |
| `/chroma/collections`           | GET/POST   | 컬렉션 목록/생성 | [Server README](./server/README.md#chromadb-컬렉션-관리) |
| `/chroma/collections/:name`     | GET/DELETE | 컬렉션 조회/삭제 | [Server README](./server/README.md#컬렉션-데이터-관리)   |
| `/chroma/collections/:name/add` | POST       | 문서 추가        | [Server README](./server/README.md#컬렉션-데이터-관리)   |
| `/rag/ingest`                   | POST       | 단일 인제스트    | [Server README](./server/README.md#rag-인제스트)         |
| `/rag/ingest-batch`             | POST       | 배치 인제스트    | [Server README](./server/README.md#rag-인제스트)         |
| `/chat/answer`                  | POST       | RAG 질의응답     | [Server README](./server/README.md#rag-질의응답)         |

### Server → RAG Engine API

| 엔드포인트    | 메소드 | 목적                  | 상세 문서                                                  |
| ------------- | ------ | --------------------- | ---------------------------------------------------------- |
| `/rag/embed`  | POST   | 텍스트 임베딩         | [RAG Engine README](./rag-engine/README.md#api-엔드포인트) |
| `/rag/ingest` | POST   | 텍스트 전처리 및 저장 | [RAG Engine README](./rag-engine/README.md#api-엔드포인트) |
| `/rag/query`  | POST   | 유사도 검색           | [RAG Engine README](./rag-engine/README.md#api-엔드포인트) |

---

## 각 디렉토리 README 안내

### 📁 [Client README](./client/README.md)

**Next.js 프런트엔드 애플리케이션**

- React 컴포넌트 구조 및 상태 관리
- Tailwind CSS 스타일링 가이드
- API 연동 및 에러 처리
- 개발 환경 설정 및 빌드 과정
- 성능 최적화 및 접근성 고려사항

### 📁 [Server README](./server/README.md)

**NestJS API 게이트웨이 서버**

- 모든 API 엔드포인트 상세 스펙
- ChromaDB, RAG 엔진, OpenRouter 연동 방법
- 환경변수 및 보안 설정
- 에러 처리 및 로깅 전략
- 테스트 방법 및 배포 가이드

### 📁 [RAG Engine README](./rag-engine/README.md)

**Python 기반 AI 처리 엔진**

- 임베딩 모델 설정 및 사용법
- CLI 및 HTTP API 사용 가이드
- 배치 인제스트 및 파일 포맷 지원
- 전처리 파이프라인 및 성능 튜닝
- Docker 배포 및 환경 설정

### 📁 [설계 문서](./design-docs/frontend-architecture.md)

**시스템 아키텍처 및 설계 결정**

- 기술 스택 선택 근거
- 데이터 흐름 및 API 설계
- UI/UX 설계 및 컴포넌트 구조
- 성능 최적화 전략
- 향후 개발 로드맵

---

## 개발 워크플로우

### 새로운 기능 개발

1. **설계 문서 업데이트**: `design-docs/` 디렉토리에 설계 문서 작성
2. **API 설계**: Server에서 새로운 엔드포인트 정의
3. **백엔드 구현**: RAG Engine 또는 Server에서 비즈니스 로직 구현
4. **프런트엔드 연동**: Client에서 UI 및 API 연동
5. **테스트 작성**: 각 계층별 단위 및 통합 테스트
6. **문서 업데이트**: 각 디렉토리의 README 업데이트

### 코드 품질 관리

```bash
# 타입 체크
pnpm typecheck

# 린팅 및 포매팅
pnpm lint
pnpm format

# 테스트 실행
pnpm test
pnpm test:e2e

# 빌드 검증
pnpm build
```

---

## 문제 해결

### 일반적인 이슈

**서비스 연결 실패**

1. 모든 서비스가 올바른 순서로 시작되었는지 확인
2. 환경변수 설정이 정확한지 검증
3. 포트 충돌이 없는지 확인 (`netstat -tlnp`)

**데이터 동기화 문제**

1. ChromaDB 컨테이너 상태 확인 (`docker compose ps`)
2. RAG Engine 임베딩 모델 로딩 상태 확인
3. Client 캐시 무효화 (`localStorage.clear()`)

**성능 저하**

1. ChromaDB 인덱스 최적화
2. RAG Engine 임베딩 캐싱 확인
3. Client 번들 크기 및 가상화 설정 검토

### 로그 수집 및 모니터링

```bash
# 모든 서비스 로그 확인
docker compose logs -f

# 특정 서비스 로그
docker compose logs -f server
docker compose logs -f rag-engine
docker compose logs -f chromadb

# 클라이언트 개발 서버 로그
cd client && pnpm dev
```

---

## 기여 가이드

### 코드 기여 프로세스

1. **이슈 확인**: 기존 이슈 검토 또는 새 이슈 생성
2. **브랜치 생성**: `feature/기능명` 또는 `fix/버그명` 형식
3. **개발**: 각 디렉토리의 개발 가이드 준수
4. **테스트**: 관련 테스트 추가 및 실행
5. **문서화**: 변경사항에 대한 문서 업데이트
6. **풀 리퀘스트**: 상세한 설명과 함께 PR 생성

### 커밋 메시지 규칙

```
feat(server): OpenRouter 연동으로 LLM 답변 생성 추가
fix(client): 컬렉션 목록 캐싱 오류 수정
docs(rag-engine): HTTP API 문서 추가
```
