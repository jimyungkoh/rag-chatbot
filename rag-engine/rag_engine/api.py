from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import RagSettings
from .pipeline import RagPipeline


class EmbedRequest(BaseModel):
  texts: List[str] = Field(default_factory=list)


class EmbedResponse(BaseModel):
  embeddings: List[List[float]]
  dimension: Optional[int]


class IngestRequest(BaseModel):
  messages: List[str] = Field(default_factory=list)
  metadata: Optional[Dict[str, Any]] = None


class IngestResponse(BaseModel):
  id: str
  text: str
  vector_dim: Optional[int]


class QueryRequest(BaseModel):
  query_text: str
  top_k: Optional[int] = None


app = FastAPI(title="rag-engine-api", version="0.1.0")

# CORS (dev): 허용 오리진을 환경변수로 제어, 기본은 *
_allow_origins = os.getenv("RAG_CORS_ORIGINS", "*")
allow_origins = [o.strip() for o in _allow_origins.split(",") if o.strip()] or ["*"]
app.add_middleware(
  CORSMiddleware,
  allow_origins=allow_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


_settings = RagSettings()
_pipeline = RagPipeline(_settings)


@app.get("/health")
def health() -> Dict[str, str]:
  return {"status": "ok"}


@app.post("/rag/embed", response_model=EmbedResponse)
def rag_embed(req: EmbedRequest) -> EmbedResponse:
  vectors = _pipeline.embedder.embed(req.texts)
  dim = _pipeline.embedder.dimension
  if dim is None and vectors and len(vectors[0]) > 0:
    dim = len(vectors[0])
  return EmbedResponse(embeddings=vectors, dimension=dim)


@app.post("/rag/ingest", response_model=IngestResponse)
async def rag_ingest(req: IngestRequest) -> IngestResponse:
  result = await _pipeline.ingest_conversation(req.messages, req.metadata)
  return IngestResponse(id=result["id"], text=result["text"], vector_dim=result.get("vector_dim"))


@app.post("/rag/query")
def rag_query(req: QueryRequest) -> Dict[str, Any]:
  result = _pipeline.similarity_search(req.query_text, req.top_k)
  return result


if __name__ == "__main__":
  import uvicorn

  host = os.getenv("RAG_ENGINE_HOST", "0.0.0.0")
  port = int(os.getenv("RAG_ENGINE_PORT", "5050"))
  uvicorn.run("rag_engine.api:app", host=host, port=port, reload=False)


