# RAG Chatbot - Frontend Client

RAG 기반 채팅 시스템의 Next.js 프런트엔드 클라이언트입니다. ChromaDB 벡터 컬렉션 관리와 RAG 기반 질의응답을 위한 웹 인터페이스를 제공합니다.

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4
- **UI 컴포넌트**: shadcn/ui
- **상태 관리**: 
  - 서버 상태: TanStack Query (React Query)
  - 클라이언트 상태: Zustand
- **폼 처리**: react-hook-form + Zod
- **패키지 관리**: pnpm
- **아이콘**: lucide-react

## 주요 기능

### 🗂️ 컬렉션 관리
- ChromaDB 벡터 컬렉션 목록 조회
- 컬렉션 생성/삭제/이름변경
- 컬렉션별 문서 통계 및 상세 정보

### 📄 문서 관리
- 컬렉션 내 문서(벡터) 목록 조회
- 텍스트 직접 추가 또는 파일 업로드
- 문서 삭제 및 메타데이터 조회
- 페이징 및 검색 지원

### 💬 RAG Playground
- 선택된 컬렉션 기반 질의응답
- 실시간 LLM 답변 생성 (OpenRouter 연동)
- 답변 생성에 사용된 컨텍스트 문서 표시
- Top-K 값 조정 및 검색 결과 커스터마이징

### 📤 배치 인제스트
- JSON/JSONL/TXT 파일 일괄 업로드
- 업로드 진행률 및 결과 리포트
- 대용량 파일 처리 지원

## 프로젝트 구조

```
client/
├── src/
│   ├── app/                    # App Router 페이지
│   │   ├── (dashboard)/        # 대시보드
│   │   ├── collections/        # 컬렉션 관리
│   │   │   └── [name]/         # 컬렉션 상세
│   │   ├── playground/         # RAG 질의응답
│   │   ├── ingest/            # 배치 인제스트
│   │   ├── layout.tsx         # 루트 레이아웃
│   │   └── providers.tsx      # Provider 설정
│   ├── components/            # UI 컴포넌트
│   │   ├── ui/               # shadcn/ui 컴포넌트
│   │   ├── collection-list.tsx
│   │   └── nav.tsx           # 네비게이션
│   ├── lib/                  # 유틸리티
│   │   ├── api-client.ts     # API 클라이언트
│   │   ├── query-keys.ts     # React Query 키
│   │   ├── types.ts          # 타입 정의
│   │   └── utils.ts          # 공통 유틸
│   └── stores/               # 상태 관리
│       └── use-app-store.ts  # Zustand 스토어
├── components.json           # shadcn/ui 설정
├── tailwind.config.ts        # Tailwind 설정
└── next.config.ts           # Next.js 설정
```

## 개발 환경 설정

### 요구사항
- Node.js 18+
- pnpm 8+

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev

# 프로덕션 빌드
pnpm build
pnpm start
```

개발 서버: http://localhost:3000

### 환경변수

`.env.local` 파일에 다음 환경변수를 설정하세요:

```bash
# 서버 API 엔드포인트
NEXT_PUBLIC_SERVER_BASE_URL=http://localhost:3001
```

## API 연동

클라이언트는 NestJS 서버와만 통신하며, 모든 데이터는 서버 API를 통해 처리됩니다:

- **컬렉션 관리**: `/chroma/collections/*`
- **문서 관리**: `/chroma/collections/:name/*`
- **RAG 인제스트**: `/rag/ingest*`
- **RAG 질의응답**: `/chat/answer`

자세한 API 스펙은 [server README](../server/README.md)를 참조하세요.

## 주요 컴포넌트

### 전역 상태 (Zustand)
```typescript
// 현재 선택된 컬렉션, UI 상태 관리
const { currentCollection, setCurrentCollection } = useAppStore()
```

### 서버 상태 (TanStack Query)
```typescript
// 컬렉션 목록
const { data: collections } = useCollectionsQuery()

// 컬렉션 생성
const createCollection = useCreateCollectionMutation()

// RAG 답변 생성
const answerMutation = useAnswerMutation()
```

### API 클라이언트
```typescript
// 타입 안전한 API 호출
import { apiClient } from '@/lib/api-client'

const collections = await apiClient.getCollections()
const answer = await apiClient.generateAnswer({
  collection: 'support-docs',
  question: '배송 기간은 얼마나 걸리나요?'
})
```

## 화면 구성

### 네비게이션
- 사이드바: Dashboard / Collections / Playground / Ingest
- 상단: 현재 컬렉션 선택 드롭다운

### 대시보드 (`/`)
- 전체 시스템 상태 개요
- 컬렉션 수, 문서 수 등 주요 메트릭

### 컬렉션 목록 (`/collections`)
- 컬렉션 테이블 (이름, 문서 수, 최근 업데이트)
- 생성/삭제/이름변경 액션

### 컬렉션 상세 (`/collections/[name]`)
- 문서 테이블 (ID, 내용 미리보기, 메타데이터)
- 문서 추가/삭제, 페이징, 검색

### RAG Playground (`/playground`)
- 질문 입력 → LLM 답변 생성
- 우측 패널: 사용된 컨텍스트 문서 표시
- Top-K, Include 옵션 조정

### 배치 인제스트 (`/ingest`)
- 파일 업로드 (드래그&드롭 지원)
- 진행률 표시 및 결과 리포트

## 스타일 가이드

### Tailwind CSS
- 다크 모드 지원
- 반응형 디자인 (모바일 퍼스트)
- 일관된 색상 시스템 및 타이포그래피

### shadcn/ui 컴포넌트
- 접근성 친화적 UI
- 일관된 디자인 언어
- 키보드 네비게이션 지원

## 개발 가이드

### 새 페이지 추가
```bash
# App Router 방식
mkdir src/app/new-page
touch src/app/new-page/page.tsx
```

### API 연동 추가
1. `src/lib/types.ts`에 타입 정의 추가
2. `src/lib/api-client.ts`에 API 메서드 구현
3. `src/lib/query-keys.ts`에 쿼리 키 추가
4. React Query 훅 생성

### UI 컴포넌트 추가
```bash
# shadcn/ui 컴포넌트 설치
npx shadcn-ui@latest add button

# 커스텀 컴포넌트 생성
touch src/components/my-component.tsx
```

## Docker 배포

```bash
# Docker 빌드 및 실행
docker build -t rag-chatbot-client .
docker run -p 3000:3000 rag-chatbot-client

# Docker Compose (권장)
docker compose up client
```

## 성능 최적화

- **이미지 최적화**: Next.js Image 컴포넌트 사용
- **번들 분할**: 동적 임포트로 코드 스플리팅
- **캐싱**: React Query로 서버 상태 캐싱
- **가상화**: 대량 데이터 테이블에 가상 스크롤 적용
- **SSR/SSG**: 적절한 렌더링 전략 적용

## 문제 해결

### 자주 발생하는 문제

**서버 연결 오류**
- `NEXT_PUBLIC_SERVER_BASE_URL` 환경변수 확인
- 서버가 실행 중인지 확인 (`http://localhost:3001`)

**스타일 적용 안됨**
- Tailwind 설정 확인 (`tailwind.config.ts`)
- CSS 파일 import 확인 (`app/globals.css`)

**타입 오류**
- 서버와 클라이언트 타입 동기화 확인
- `pnpm typecheck` 실행

### 디버깅

```bash
# 타입 체크
pnpm typecheck

# 린팅
pnpm lint

# 빌드 테스트
pnpm build
```

## 관련 문서

- [서버 API 문서](../server/README.md)
- [RAG 엔진 문서](../rag-engine/README.md)
- [전체 시스템 아키텍처](../design-docs/frontend-architecture.md)