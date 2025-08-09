"""Command-line interface for rag-engine.

간단한 인제스트/검색 워크플로를 제공하는 CLI 래퍼입니다.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import List

from .config import RagSettings
from .pipeline import RagPipeline


def _read_messages_from_file(path: str) -> List[str]:
  """파일에서 메시지 목록 로드.

  - JSON 배열 형식 우선
  - 실패 시 줄바꿈 분리 텍스트 사용
  """
  with open(path, "r", encoding="utf-8") as f:
    data = f.read()
  try:
    obj = json.loads(data)
    if isinstance(obj, list):
      return [str(x) for x in obj]
  except Exception:
    pass
  # newline separated fallback
  return [ln.strip() for ln in data.splitlines() if ln.strip()]


async def _cmd_ingest(args: argparse.Namespace) -> None:
  """대화 인제스트 서브커맨드 핸들러."""
  settings = RagSettings()
  pipeline = RagPipeline(settings)

  messages: List[str] = []
  if args.from_file:
    messages.extend(_read_messages_from_file(args.from_file))
  if args.msg:
    messages.extend(args.msg)
  if not messages:
    print("No messages provided. Use --msg or --from-file.")
    sys.exit(1)

  result = await pipeline.ingest_conversation(messages, metadata={"source": args.source or "cli"})
  print(json.dumps(result, ensure_ascii=False, indent=2))


def _cmd_query(args: argparse.Namespace) -> None:
  """유사도 검색 서브커맨드 핸들러."""
  settings = RagSettings()
  pipeline = RagPipeline(settings)
  res = pipeline.similarity_search(query_text=args.text, top_k=args.k)
  print(json.dumps(res, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
  """argparse 파서 구성."""
  p = argparse.ArgumentParser(prog="rag-engine", description="RAG Engine CLI")
  sub = p.add_subparsers(dest="command")

  ing = sub.add_parser("ingest", help="Preprocess → embed → upsert to Chroma")
  ing.add_argument("--msg", action="append", help="Message text (repeatable)")
  ing.add_argument("--from-file", help="Path to JSON array or newline-separated messages file")
  ing.add_argument("--source", help="Metadata source tag", default="cli")
  ing.set_defaults(func=lambda a: asyncio.run(_cmd_ingest(a)))

  qry = sub.add_parser("query", help="Embed query text → similarity search")
  qry.add_argument("--text", required=True, help="Query text")
  qry.add_argument("-k", type=int, default=None, help="Top-K results")
  qry.set_defaults(func=_cmd_query)

  return p


def main(argv: List[str] | None = None) -> None:
  """엔트리포인트."""
  parser = build_parser()
  args = parser.parse_args(argv)
  if not hasattr(args, "func"):
    parser.print_help()
    sys.exit(2)
  args.func(args)


if __name__ == "__main__":
  main()


