"""RAG Engine runtime configuration.

환경 변수 중심으로 전처리(OpenRouter), 임베딩 백엔드(Potion 또는 ST),
Chroma 서버 접속 정보를 관리합니다. 코드 전역에서 동일한 설정 소스를
사용하기 위해 `RagSettings`를 단일 진입점으로 둡니다.
"""
from __future__ import annotations

from pydantic import BaseModel, Field
import os


class RagSettings(BaseModel):
  """RAG 엔진 런타임 설정 모델.

  - OpenRouter: 전처리 호출 시 사용되는 API 키/엔드포인트/모델
  - Embedding: 임베딩 모델 ID 및 디바이스(cpu/gpu)
  - Chroma: 호스트/포트/컬렉션명
  - Query: 기본 top-k

  참고: OpenRouter 전처리를 사용하려면 실행 환경에 `OPENROUTER_API_KEY`를
  설정해야 합니다. 미설정 시 휴리스틱 전처리로 자동 폴백됩니다.
  """

  # OpenRouter
  openrouter_api_key: str | None = Field(
    default_factory=lambda: os.getenv("OPENROUTER_API_KEY")
  )
  openrouter_base_url: str = Field(
    default=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
  )
  openrouter_model: str = Field(
    default=os.getenv("OPENROUTER_MODEL", "openai/gpt-5-nano")
  )

  # Embedding model
  embedding_model_id: str = Field(
    default=os.getenv("EMBEDDING_MODEL_ID", "minishlab/potion-multilingual-128M")
  )
  embedding_device: str = Field(default=os.getenv("EMBEDDING_DEVICE", "cpu"))

  # Chroma server
  chroma_host: str = Field(default=os.getenv("CHROMA_HOST", "localhost"))
  chroma_port: int = Field(default=int(os.getenv("CHROMA_PORT", "8000")))
  chroma_collection: str = Field(default=os.getenv("CHROMA_COLLECTION", "conversations"))

  # Misc
  default_top_k: int = Field(default=int(os.getenv("DEFAULT_TOP_K", "5")))


