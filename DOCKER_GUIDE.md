# RAG Chatbot Docker 통합 실행 가이드

이 가이드는 RAG Engine, ChromaDB, Server를 모두 Docker로 통합 실행하는 방법을 설명합니다.

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 프로젝트 루트 디렉토리에서
cp .env.example .env
# .env 파일에서 필요한 환경변수 설정 (OpenRouter API Key 등)
```

### 2. 모든 서비스 시작

```bash
./rag-engine-cli.sh start
```

### 2-1. 개발 모드로 시작(볼륨 마운트/자동 리로드)

```bash
# dev 컴포즈 파일 사용
docker compose -f docker-compose.dev.yml up -d

# 또는 헬퍼 스크립트와 함께 사용
COMPOSE_FILE=docker-compose.dev.yml ./rag-engine-cli.sh start
```

### 3. 예제 데이터 인제스트

```bash
# 대화 데이터 인제스트
./rag-engine-cli.sh ingest --msg "Q: 안녕하세요" --msg "A: 무엇을 도와드릴까요?"

# 파일에서 배치 인제스트
./rag-engine-cli.sh ingest-batch --from-file ./rag-engine/examples/chat.json
```

### 4. 검색 테스트

```bash
./rag-engine-cli.sh query --text "안녕하세요" -k 3
```

## 📋 서비스 구성

### 실행되는 서비스들

- **ChromaDB**: `localhost:8000` - 벡터 데이터베이스
- **Server**: `localhost:4000` - NestJS API 서버(챗 응답 + 배치 인제스트 프록시)
- **RAG Engine**: FastAPI(기본 5050 포트) + CLI

### 서비스 상태 확인

```bash
./rag-engine-cli.sh status
```

## 🛠️ 헬퍼 스크립트 사용법

### 기본 Docker 명령어

```bash
# 서비스 시작
./rag-engine-cli.sh start

# 서비스 중지
./rag-engine-cli.sh stop

# 서비스 재시작
./rag-engine-cli.sh restart

# 로그 확인 (모든 서비스)
./rag-engine-cli.sh logs

# 특정 서비스 로그
./rag-engine-cli.sh logs chromadb
./rag-engine-cli.sh logs server
./rag-engine-cli.sh logs rag-engine
```

### RAG Engine 명령어

```bash
# 단일 대화 인제스트
./rag-engine-cli.sh ingest --msg "Q: 주문 조회 방법은?" --msg "A: 마이페이지에서 확인 가능합니다."

# 파일에서 인제스트
./rag-engine-cli.sh ingest --from-file ./rag-engine/examples/chat.json

# 배치 인제스트 (디렉토리)
./rag-engine-cli.sh ingest-batch --from-dir ./rag-engine/conversations --source support-logs

# 배치 인제스트 (JSONL)
./rag-engine-cli.sh ingest-batch --from-jsonl ./rag-engine/conversations/chats.jsonl

# 유사도 검색
./rag-engine-cli.sh query --text "주문 조회" -k 5

# 인터랙티브 쉘 접속
./rag-engine-cli.sh shell
```

### 인터랙티브 쉘에서 사용

```bash
# 쉘 접속
./rag-engine-cli.sh shell

# 쉘 내에서 직접 명령어 실행
rag-engine ingest --msg "Q: 배송 기간은?" --msg "A: 2-3일 소요됩니다."
rag-engine query --text "배송" -k 3
```

## 🔧 환경변수 설정

`.env` 파일에서 설정 가능한 환경변수들:

```env
# ChromaDB 설정
CHROMA_COLLECTION=conversations

# 임베딩 모델 설정
EMBEDDING_MODEL_ID=minishlab/potion-multilingual-128M
EMBEDDING_DEVICE=cpu

# 검색 설정
DEFAULT_TOP_K=5

# OpenRouter 설정 (서버/엔진에서 사용)
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-5-nano
```

## 📁 데이터 영속성

### 볼륨 마운트

- `./content/chromadb` → ChromaDB 데이터 영속화
- `./rag-engine/conversations` → 대화 데이터 파일
- `./rag-engine/examples` → 예제 데이터 파일
- `rag-engine-data` → RAG Engine 런타임 데이터

### 데이터 백업

```bash
# ChromaDB 데이터 백업
cp -r ./content/chromadb ./backup/chromadb-$(date +%Y%m%d)

# 대화 데이터 백업
cp -r ./rag-engine/conversations ./backup/conversations-$(date +%Y%m%d)
```

## 🐛 문제 해결

### 일반적인 문제들

#### ChromaDB 연결 실패

```bash
# ChromaDB 상태 확인
./rag-engine-cli.sh logs chromadb

# ChromaDB 재시작
docker-compose restart chromadb
```

#### 임베딩 모델 다운로드 실패

```bash
# 쉘 접속해서 수동으로 모델 다운로드 확인
./rag-engine-cli.sh shell
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')"
```

#### 권한 문제

```bash
# 실행 권한 부여
chmod +x ./rag-engine-cli.sh
```

### 로그 확인

```bash
# 모든 서비스 로그
./rag-engine-cli.sh logs

# 특정 서비스만 (실시간)
./rag-engine-cli.sh logs rag-engine
```

## 🔄 개발 워크플로우

### 코드 변경 반영

개발 모드에서는 볼륨 마운트로 코드 변경이 즉시 반영됩니다. NestJS 서버는 `pnpm start:dev`로 자동 리로드됩니다.

### 코드 변경 후 재빌드(프로덕션 이미지)

```bash
# 특정 서비스만 재빌드
docker-compose build rag-engine
docker-compose build server

# 모든 서비스 재빌드
./rag-engine-cli.sh build
```

### 데이터베이스 초기화

```bash
# ChromaDB 데이터 삭제 (주의!)
./rag-engine-cli.sh stop
rm -rf ./content/chromadb/*
./rag-engine-cli.sh start
```

## 📊 모니터링

### 서비스 상태 모니터링

```bash
# 서비스 상태
./rag-engine-cli.sh status

# 리소스 사용량
docker stats rag-chatbot-chromadb rag-chatbot-server rag-chatbot-rag-engine
```

### 헬스체크

```bash
# ChromaDB 헬스체크
curl http://localhost:8000/api/v1/heartbeat

# Server 헬스체크
curl http://localhost:4000/chroma/collections
```

## 🚀 프로덕션 배포 고려사항

### 보안

- `.env` 파일을 git에 커밋하지 마세요
- 프로덕션에서는 별도의 환경변수 관리 시스템 사용 권장

### 성능

- `EMBEDDING_DEVICE=cuda` (GPU 사용 시)
- ChromaDB 영속 스토리지 최적화
- Docker 리소스 제한 설정

### 모니터링

- 로그 수집 시스템 연동
- 메트릭 모니터링 설정
- 자동 백업 스케줄 설정

## 📝 추가 정보

자세한 RAG Engine 사용법은 `rag-engine/README.md`를 참조하세요.
