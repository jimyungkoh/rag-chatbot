# Python 3.10 베이스 이미지 사용
FROM python:3.10-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (컴파일 도구 등)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치를 위한 파일 복사
COPY requirements.txt .
COPY pyproject.toml .

# Python 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# rag-engine 패키지 설치 (editable mode)
RUN pip install -e .

# 환경변수 기본값 설정
ENV CHROMA_HOST=chromadb
ENV CHROMA_PORT=8000
ENV EMBEDDING_DEVICE=cpu

# ChromaDB 연결을 기다리는 헬퍼 스크립트 생성
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
host="$1"\n\
port="$2"\n\
shift 2\n\
cmd="$@"\n\
\n\
until nc -z "$host" "$port"; do\n\
  >&2 echo "Waiting for $host:$port..."\n\
  sleep 1\n\
done\n\
\n\
>&2 echo "$host:$port is available - executing command"\n\
exec $cmd' > /wait-for-it.sh && chmod +x /wait-for-it.sh

# netcat 설치 (연결 대기용)
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

# 기본 명령어 설정 (대화형 모드)
CMD ["uvicorn", "rag_engine.api:app", "--host", "0.0.0.0", "--port", "5050"]