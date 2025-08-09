"""Preprocessing module.

대화(다중 발화)를 임베딩 친화적인 단일 텍스트로 변환합니다.
OpenRouter가 사용 가능하면 LLM 기반 전처리를 수행하고, 그렇지 않으면
로컬 휴리스틱 정규화로 폴백합니다.
"""
from __future__ import annotations

from typing import Iterable
import httpx

from .config import RagSettings


SYSTEM_PROMPT = (
  "You are a preprocessing assistant for a RAG system. "
  "Given raw multi-turn chat transcripts, produce a clean, concise text that preserves facts and is optimal for dense retrieval embeddings. "
  "The transcript uses explicit turn labels: 'Q:' for user questions and 'A:' for assistant answers. "
  "Strictly preserve Q/A labels and turn order in the output. "
  "Remove filler, normalize spacing/casing, expand abbreviations, and keep key entities, dates, amounts, and tasks. "
  "Output Korean if input is Korean; otherwise keep the original language."
)


class Preprocessor:
  """대화 전처리기.

  - 입력: 발화 목록(문자열 Iterable)
  - 출력: 사실 유지, 중복/군더더기 제거, 임베딩 친화적 단일 텍스트
  - 전략: OpenRouter 우선 → 실패 시 휴리스틱
  """

  def __init__(self, settings: RagSettings) -> None:
    """설정 주입."""
    self.settings = settings

  async def preprocess(self, messages: Iterable[str]) -> str:
    """발화 목록을 하나의 임베딩 최적 텍스트로 변환.

    - OpenRouter 키가 없으면 휴리스틱 폴백 사용
    - 키가 있으면 OpenAI 호환 Chat Completions로 전처리 텍스트 생성
    """
    joined = "\n".join(m.strip() for m in messages if m and m.strip())
    if not self.settings.openrouter_api_key:
      return self._fallback_heuristic(joined)

    try:
      return await self._call_openrouter(joined)
    except Exception:
      return self._fallback_heuristic(joined)

  def _fallback_heuristic(self, text: str) -> str:
    """간단 정규화 폴백: 공백/불릿 제거, 빈 줄 제거."""
    text = text.replace("\r", "\n").strip()
    while "  " in text:
      text = text.replace("  " , " ")
    lines = [ln.strip(" -•\t") for ln in text.split("\n")]
    lines = [ln for ln in lines if ln]
    return "\n".join(lines)

  async def _call_openrouter(self, text: str) -> str:
    """OpenRouter Chat Completions 호출로 전처리 텍스트 생성.

    OpenAI 호환 스키마(`choices[0].message.content`)를 파싱합니다.
    예외 발생 시 상위에서 휴리스틱으로 폴백됩니다.
    """
    url = f"{self.settings.openrouter_base_url}/chat/completions"
    headers = {
      "Authorization": f"Bearer {self.settings.openrouter_api_key}",
      "Content-Type": "application/json",
      "HTTP-Referer": "https://localhost",  # optional
      "X-Title": "rag-engine-preprocessor",
    }
    payload = {
      "model": self.settings.openrouter_model,
      "messages": [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
          "role": "user",
          "content": (
            "아래는 다중 화자의 대화 기록입니다(Q/A 접두어 포함). "
            "각 발화의 'Q:' 또는 'A:' 접두어를 반드시 유지하면서, 벡터 임베딩에 최적인 한국어 요약/정규화 텍스트를 생성하세요. "
            "불필요한 군더더기는 제거하되, 사실과 의미, 엔티티·날짜·금액·작업 항목은 보존하세요.\n\n" + text
          ),
        },
      ],
      "temperature": 0.2,
      "max_tokens": 800,
    }
    async with httpx.AsyncClient(timeout=60) as client:
      resp = await client.post(url, headers=headers, json=payload)
      resp.raise_for_status()
      data = resp.json()
      # OpenAI-compatible schema
      return data["choices"][0]["message"]["content"].strip()


