"""Command-line interface for rag-engine.

간단한 인제스트/검색 워크플로를 제공하는 CLI 래퍼입니다.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import List
import re
from pathlib import Path

from .config import RagSettings
from .pipeline import RagPipeline


QA_PREFIX_PATTERN = re.compile(r"^\s*([QqAa])\s*:")


def _map_role_to_prefix(role: str) -> str:
  """역할 문자열을 Q/A 접두어로 매핑."""
  r = (role or "").strip().lower()
  if r in {"user", "question", "q"}:
    return "Q"
  if r in {"assistant", "answer", "a"}:
    return "A"
  # 기본값: 사용자 입력을 Q로 간주
  return "Q"


def _ensure_qa_prefixes(messages: List[str]) -> List[str]:
  """모든 발화에 Q:/A: 접두어를 강제한다.

  - 이미 Q:/A:로 시작하면 유지
  - 아니면 0,2,4,... → Q:, 1,3,5,... → A: 로 자동 접두
  """
  normalized: List[str] = []
  for idx, m in enumerate(messages):
    text = str(m).strip()
    if not text:
      continue
    if QA_PREFIX_PATTERN.match(text):
      # 접두어 대문자 정규화(Q/A)
      prefix = text.split(":", 1)[0].strip().upper()
      rest = text.split(":", 1)[1].lstrip()
      normalized.append(f"{prefix}: {rest}")
      continue
    prefix = "Q" if idx % 2 == 0 else "A"
    normalized.append(f"{prefix}: {text}")
  return normalized


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
      # 단일 대화(JSON 배열)
      if all(isinstance(x, str) for x in obj):
        return _ensure_qa_prefixes([str(x) for x in obj])
      # 역할 기반 객체 배열 지원: [{role, content}, ...]
      if all(isinstance(x, dict) and "content" in x for x in obj):
        msgs: List[str] = []
        for x in obj:
          role = _map_role_to_prefix(str(x.get("role", "")))
          content = str(x.get("content", "")).strip()
          if content:
            msgs.append(f"{role}: {content}")
        return _ensure_qa_prefixes(msgs)
      # 중첩 배열(배치)은 ingest-batch 사용 권장
      raise ValueError("Nested arrays provided; use ingest-batch for multiple conversations.")
  except Exception:
    pass
  # newline separated fallback
  return _ensure_qa_prefixes([ln.strip() for ln in data.splitlines() if ln.strip()])


async def _cmd_ingest(args: argparse.Namespace) -> None:
  """대화 인제스트 서브커맨드 핸들러."""
  settings = RagSettings()
  pipeline = RagPipeline(settings)

  messages: List[str] = []
  if args.from_file:
    messages.extend(_read_messages_from_file(args.from_file))
  if args.msg:
    messages.extend(_ensure_qa_prefixes(args.msg))
  if not messages:
    print("No messages provided. Use --msg or --from-file.")
    sys.exit(1)

  result = await pipeline.ingest_conversation(messages, metadata={"source": args.source or "cli"})
  print(json.dumps(result, ensure_ascii=False, indent=2))


def _read_conversations_from_file(path: str) -> List[List[str]]:
  """파일에서 다중 대화 로드 지원.

  지원 형식:
  - JSON 배열의 배열: [["...", "..."], ["..."], ...]
  - JSON 배열(단일 대화): ["...", "..."] → 1건으로 래핑
  - 줄바꿈 분리 텍스트: 각 줄이 한 발화인 단일 대화 → 1건으로 래핑
  """
  with open(path, "r", encoding="utf-8") as f:
    data = f.read()
  try:
    obj = json.loads(data)
    if isinstance(obj, list):
      if all(isinstance(x, list) for x in obj):
        return [_ensure_qa_prefixes([str(xx) for xx in x]) for x in obj]
      if all(isinstance(x, str) for x in obj):
        return [_ensure_qa_prefixes([str(x) for x in obj])]
      # 역할 기반 객체 배열: 한 파일=한 대화
      if all(isinstance(x, dict) and "content" in x for x in obj):
        msgs: List[str] = []
        for x in obj:
          role = _map_role_to_prefix(str(x.get("role", "")))
          content = str(x.get("content", "")).strip()
          if content:
            msgs.append(f"{role}: {content}")
        return [_ensure_qa_prefixes(msgs)]
  except Exception:
    pass
  # fallback: newline separated file → single conversation
  msgs = [ln.strip() for ln in data.splitlines() if ln.strip()]
  return [_ensure_qa_prefixes(msgs)] if msgs else []


def _read_conversations_from_jsonl(path: str) -> List[List[str]]:
  """JSONL에서 한 줄당 한 대화.

  각 라인은 다음 중 하나:
  - ["..."] 문자열 배열
  - {"messages": ["..."]}
  """
  conversations: List[List[str]] = []
  with open(path, "r", encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      try:
        obj = json.loads(line)
        if isinstance(obj, list) and all(isinstance(x, str) for x in obj):
          conversations.append(_ensure_qa_prefixes([str(x) for x in obj]))
          continue
        if isinstance(obj, dict):
          # {"messages": [...]}
          if isinstance(obj.get("messages"), list):
            arr = obj.get("messages")
            # 문자열 배열
            if all(isinstance(x, str) for x in arr):
              conversations.append(_ensure_qa_prefixes([str(x) for x in arr]))
              continue
            # 역할 객체 배열
            if all(isinstance(x, dict) and "content" in x for x in arr):
              msgs: List[str] = []
              for x in arr:
                role = _map_role_to_prefix(str(x.get("role", "")))
                content = str(x.get("content", "")).strip()
                if content:
                  msgs.append(f"{role}: {content}")
              conversations.append(_ensure_qa_prefixes(msgs))
              continue
          # {"q": "..", "a": ".."}
          if isinstance(obj.get("q"), str) and isinstance(obj.get("a"), str):
            q = obj.get("q").strip()
            a = obj.get("a").strip()
            conversations.append(_ensure_qa_prefixes([f"Q: {q}", f"A: {a}"]))
            continue
      except Exception:
        continue
  return conversations


async def _cmd_ingest_batch(args: argparse.Namespace) -> None:
  """다중 대화 배치 인제스트."""
  settings = RagSettings()
  pipeline = RagPipeline(settings)

  conversations: List[List[str]] = []
  sources: List[str] = []

  if args.from_dir:
    dir_path = Path(args.from_dir)
    for path in sorted(dir_path.glob("**/*")):
      if path.is_file() and path.suffix.lower() in {".json", ".txt", ".jsonl"}:
        if path.suffix.lower() == ".jsonl":
          convs = _read_conversations_from_jsonl(str(path))
          conversations.extend(convs)
          sources.extend([f"jsonl:{path.name}"] * len(convs))
        else:
          convs = _read_conversations_from_file(str(path))
          conversations.extend(convs)
          sources.extend([f"file:{path.name}"] * len(convs))

  if args.from_jsonl:
    convs = _read_conversations_from_jsonl(args.from_jsonl)
    conversations.extend(convs)
    sources.extend([f"jsonl:{Path(args.from_jsonl).name}"] * len(convs))

  if args.from_file:
    convs = _read_conversations_from_file(args.from_file)
    conversations.extend(convs)
    sources.extend([f"file:{Path(args.from_file).name}"] * len(convs))

  if not conversations:
    print("No conversations found. Use --from-dir, --from-jsonl, or --from-file.")
    sys.exit(1)

  results = []
  for idx, msgs in enumerate(conversations):
    meta = {"source": args.source or "cli-batch", "batch_index": idx, "origin": sources[idx] if idx < len(sources) else None}
    res = await pipeline.ingest_conversation(msgs, metadata=meta)
    results.append(res)

  print(json.dumps({"count": len(results), "items": results}, ensure_ascii=False, indent=2))


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

  ingb = sub.add_parser("ingest-batch", help="Batch ingest multiple conversations from dir/jsonl/file")
  ingb.add_argument("--from-dir", help="Directory containing .json/.txt/.jsonl files")
  ingb.add_argument("--from-jsonl", help="Path to JSONL file; each line is an array or an object with 'messages'")
  ingb.add_argument("--from-file", help="Path to file; supports nested arrays [[...],[...]] for multiple conversations")
  ingb.add_argument("--source", help="Metadata source tag for all items", default="cli-batch")
  ingb.set_defaults(func=lambda a: asyncio.run(_cmd_ingest_batch(a)))

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


