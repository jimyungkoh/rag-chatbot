# rag-engine

전처리(OpenRouter 선택적) → 임베딩(Potion 또는 STS 폴백) → ChromaDB 업서트/검색 파이프라인.

## 요구사항

- Python 3.10+
- Docker (ChromaDB)

## 설치

```bash
cd rag-engine
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
```

## ChromaDB (Docker)

루트 `docker-compose.yml`를 사용:

```bash
cd ..
docker compose up -d chromadb
```

기본 접속: `http://localhost:8000` (HTTP 클라이언트 사용)

## 환경변수

아래 값을 `.env`에 설정(선택):

- `OPENROUTER_API_KEY`: 전처리에 OpenRouter 사용 시 필요. 미설정 시 로컬 휴리스틱 전처리 사용
- `OPENROUTER_BASE_URL` (기본 `https://openrouter.ai/api/v1`)
- `OPENROUTER_MODEL` (기본 `openai/gpt-5-nano`)
- `EMBEDDING_MODEL_ID` (고정 `minishlab/potion-multilingual-128M` 권장)
- `EMBEDDING_DEVICE` (기본 `cpu`)
- `CHROMA_HOST` (기본 `localhost`)
- `CHROMA_PORT` (기본 `8000`)
- `CHROMA_COLLECTION` (기본 `conversations`) — 본 프로젝트는 256차원(Potion)만 사용합니다.
- `DEFAULT_TOP_K` (기본 `5`)

### DEFAULT_TOP_K

- 정의: 유사도 검색 시 반환할 결과 개수의 기본값
- 위치: `rag_engine/config.py`의 `RagSettings.default_top_k` (기본 5)
- 사용처: `RagPipeline.similarity_search()`에서 `top_k` 미지정 시 사용
- 우선순위: 메서드 인자(`top_k`) > 환경변수(`DEFAULT_TOP_K`) > 기본값(5)
- 변경 방법:
  - 일시: `rag-engine query --text "..." -k 8`
  - 전역(세션): `export DEFAULT_TOP_K=10`
- 트레이드오프: 값이 크면 recall↑(더 많이 가져옴) 대신 지연/후처리 비용↑, 작으면 precision↑/지연↓
- 권장 범위: Q&A 3~10, 브라우징/요약 10~20, 실시간 응답 3~5

## 사용법

### 대화 인제스트

```bash
rag-engine ingest --msg "안녕하세요" --msg "주문 123은 내일 배송 예정입니다."
```

또는 파일 입력(JSON 배열 또는 줄바꿈 분리):

```bash
rag-engine ingest --from-file ./examples/chat.json
```

### 유사도 검색

```bash
rag-engine query --text "주문 123 배송 일정"
```

## 임베딩 백엔드

- 기본: Potion `minishlab/potion-multilingual-128M` (model2vec가 설치되어 있어야 함)
- 폴백: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`

model2vec가 PyPI에 없거나 설치 실패 시 자동으로 폴백됩니다.

## 디렉토리 구조

```
rag-engine/
  rag_engine/
    __init__.py           # 공개 API: RagPipeline, EmbeddingModel 등
    config.py             # 환경 변수 기반 설정 모델(RagSettings)
    preprocess.py         # OpenRouter 전처리기(휴리스틱 폴백 포함)
    embedding.py          # Potion 우선 임베더(ST 폴백)
    vector_store.py       # Chroma 어댑터(HTTP→로컬 영속→메모리 순 폴백)
    pipeline.py           # 전처리→임베딩→저장/검색 파이프라인 오케스트레이션
    cli.py                # ingest/query CLI 엔트리포인트
  requirements.txt        # 런타임 의존성
  pyproject.toml          # 패키지/CLI 스크립트 정의
  README.md               # 사용 가이드
```

### 모듈 설명

- `config.py`: OpenRouter/Embedding/Chroma 설정을 단일 모델로 관리.
- `preprocess.py`: 입력 대화 → LLM 기반 정규화 텍스트(키 없으면 휴리스틱).
- `embedding.py`: Potion(256d) → 실패 시 ST(384d) 자동 폴백, `dimension` 제공.
- `vector_store.py`: 업서트/쿼리 래핑. 서버 불가 시 로컬 영속 경로(`~/.rag_chromadb`).
- `pipeline.py`: ingest/query 고수준 API.
- `cli.py`: 간단한 운영용 명령.
