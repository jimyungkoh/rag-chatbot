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
rag-engine ingest --msg "Q: 안녕하세요" --msg "A: 무엇을 도와드릴까요?" --msg "Q: 주문 123 배송 일정이 궁금합니다"
```

또는 파일 입력(JSON 배열 또는 줄바꿈 분리):

```bash
rag-engine ingest --from-file ./examples/chat.json
```

#### 입력 파일 포맷 명세

- JSON 배열 형식(권장): 문자열 요소들의 배열
  - 예: `examples/chat.json`
  - 형식: `[
  "발화1",
  "발화2",
  ...
]`
- 줄바꿈 분리 텍스트(.txt 등): 각 줄이 한 발화로 처리됨

예시 파일 생성(Q/A 접두어 권장/강제):

```bash
mkdir -p rag-engine/examples
cat > rag-engine/examples/chat.json << 'JSON'
[
  "Q: 안녕하세요, 고객지원입니다.",
  "A: 안녕하세요! 무엇을 도와드릴까요?",
  "Q: 주문 123번 상태가 어떻게 되나요?",
  "A: 내일(5/11) 택배 발송 예정입니다."
]
JSON
```

실행 예시와 출력(요약):

```bash
rag-engine ingest --from-file ./examples/chat.json
# {
#   "id": "<UUID>",
#   "text": "...전처리된 단일 텍스트...",
#   "vector_dim": 256
# }
```

### 유사도 검색

```bash
rag-engine query --text "주문 123 배송 일정"
```

옵션:

- `-k <int>`: 반환할 결과 수(기본 `DEFAULT_TOP_K`, 기본값 5)

### Q/A 패턴 강제

- 모든 입력 발화는 `Q:` 또는 `A:` 접두어를 사용합니다. 접두어가 없으면 엔진이 자동으로 교정합니다(짝수=Q, 홀수=A).
- 역할 기반 형식도 지원합니다: `[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]` → Q/A로 정규화됨.
- 전처리는 Q/A 레이블을 보존하여 임베딩 친화적인 텍스트로 변환합니다.

### 배치 인제스트(여러 대화)

여러 개의 대화를 한 번에 처리하려면 배치 명령을 사용합니다.

```bash
# 디렉토리에서 .json/.txt/.jsonl 스캔
rag-engine ingest-batch --from-dir ./datasets/chats --source support-logs

# JSONL(한 줄당 한 대화):
# - ["...", "..."] 또는 {"messages": ["..."]}
rag-engine ingest-batch --from-jsonl ./datasets/chats.jsonl

# 단일 파일 내 다중 대화: [["..."], ["..."]]
rag-engine ingest-batch --from-file ./datasets/multi.json
```

입력 형식:

- 디렉토리: 확장자별 처리
  - `.json`: `["..."]` 또는 `[["..."],["..."]]`
  - `.txt`: 줄바꿈 분리(한 파일=한 대화)
  - `.jsonl`: 한 줄당 한 대화. 라인은 `["..."]` 또는 `{ "messages": ["..."] }`
- 메타데이터: `source`, `batch_index`, `origin(파일명)`가 자동 주입됩니다.

#### 메타데이터 상세: `source`/`batch_index`/`origin`

- `source`: 도메인/수집원을 나타내는 자유형 태그. 검색 결과의 `metadatas`에 그대로 노출됩니다.
  - 예: `support-logs`(고객지원/헬프데스크 상담 로그), `sales-chats`(영업 대화), `forum`(포럼 글), `doc`(문서 요약)
  - 용도: 출처 추적, 필터링/세그멘테이션 전략 수립(컬렉션을 나눌지 `source`로 구분할지 결정)
  - 권장: 조직/도메인/프로젝트 단위로 일관된 네이밍 사용. 대규모 분리는 `CHROMA_COLLECTION`으로 컬렉션을 분리
- `batch_index`: 배치 내 처리 순번(0부터 시작). 재현성/로그 추적에 사용
- `origin`: 원본 파일명 또는 JSONL 라인 출처(예: `file:chat.json`, `jsonl:chats.jsonl`)

#### 배치 인제스트 예시

1. 디렉토리 기반(from-dir)

```bash
cd rag-engine
mkdir -p datasets/chats

# 단일 대화(JSON 배열)
cat > datasets/chats/chat1.json << 'JSON'
[
  "Q: 반품하려면 어떻게 하나요?",
  "A: 주문번호와 사유를 알려주시면 절차를 안내드립니다."
]
JSON

# 단일 대화(줄바꿈 분리 텍스트)
cat > datasets/chats/chat2.txt << 'TXT'
Q: 재고가 언제 입고되나요?
A: 다음 주 수요일 예정입니다.
TXT

# 다중 대화(JSON 배열의 배열)
cat > datasets/chats/multi.json << 'JSON'
[
  [
    "Q: 쿠폰 적용이 안돼요.",
    "A: 적용 조건(최소금액/카테고리)을 확인해주세요."
  ],
  [
    "Q: 계산서 발급 가능한가요?",
    "A: 네, 사업자등록증을 보내주시면 발급해드립니다."
  ]
]
JSON

# JSONL(한 줄당 한 대화): 문자열 배열 또는 {messages: [...]} 또는 {q: "..", a: ".."}
cat > datasets/chats/chats.jsonl << 'JSONL'
["Q: 배송지 변경 가능할까요?", "A: 출고 전이면 가능합니다."]
{"messages": [{"role":"user","content":"Q: 결제수단 변경은?"}, {"role":"assistant","content":"A: 주문서에서 가능합니다."}]}
{"q":"교환 규정 알려주세요.", "a":"상품 수령 후 7일 이내 가능합니다."}
JSONL

# 배치 인제스트 실행
rag-engine ingest-batch --from-dir ./datasets/chats --source support-logs
```

예상 출력(요약):

```json
{
  "count": 5,
  "items": [
    { "id": "...", "text": "Q: 반품하려면...\nA: 주문번호...", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 재고가...\nA: 다음 주...", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 쿠폰...\nA: 적용 조건...", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 계산서...\nA: 네...", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 배송지...\nA: 출고 전...", "vector_dim": 256|384 }
  ]
}
```

2. JSONL 파일만 사용하는 경우(from-jsonl)

```bash
cd rag-engine
cat > datasets/chats_only.jsonl << 'JSONL'
["Q: A/S 접수는 어디서 하나요?", "A: 고객센터 페이지에서 가능합니다."]
{"messages": ["Q: 영수증 재발행 가능?", "A: 네, 마이페이지에서 다운로드 가능."]}
JSONL

rag-engine ingest-batch --from-jsonl ./datasets/chats_only.jsonl --source support-logs
```

예상 출력(요약):

```json
{
  "count": 2,
  "items": [
    { "id": "...", "text": "Q: A/S 접수는 어디서 하나요?\nA: 고객센터 페이지에서 가능합니다.", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 영수증 재발행 가능?\nA: 네, 마이페이지에서 다운로드 가능.", "vector_dim": 256|384 }
  ]
}
```

3. 한 파일 안에 여러 대화(from-file, nested arrays)

```bash
cd rag-engine
cat > datasets/multi_nested.json << 'JSON'
[
  ["Q: 회원등급 기준은?", "A: 누적 구매액으로 산정됩니다."],
  ["Q: 해외배송 가능?", "A: 일부 국가만 지원합니다."]
]
JSON

rag-engine ingest-batch --from-file ./datasets/multi_nested.json --source support-logs
```

예상 출력(요약):

```json
{
  "count": 2,
  "items": [
    { "id": "...", "text": "Q: 회원등급 기준은?\nA: 누적 구매액으로 산정됩니다.", "vector_dim": 256|384 },
    { "id": "...", "text": "Q: 해외배송 가능?\nA: 일부 국가만 지원합니다.", "vector_dim": 256|384 }
  ]
}
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
