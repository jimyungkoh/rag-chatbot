"use client";

import { Nav } from "@/components/nav";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export default function IngestPage() {
  const [messages, setMessages] = useState(
    "Q: 안녕하세요\nA: 무엇을 도와드릴까요?"
  );
  const [file, setFile] = useState<File | null>(null);

  const ingestMut = useMutation({
    mutationFn: async () => {
      const base =
        process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4000";
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(`${base}/rag/ingest-batch`, {
          method: "POST",
          body: fd,
        });
        if (!r.ok) throw new Error("batch failed");
        return r.json();
      }
      const body = {
        messages: messages.split("\n").filter(Boolean),
        metadata: { source: "manual" },
      };
      const res = await fetch(`${base}/rag/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("ingest failed");
      return res.json();
    },
  });

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Ingest</h1>
        <p className="text-sm text-muted-foreground mb-4">
          서버 API(`/rag/ingest`, `/rag/ingest-batch`)로 전송합니다.
        </p>

        <div className="mb-3">
          <label className="block text-sm mb-1">메시지(줄바꿈 분리)</label>
          <textarea
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            className="border rounded px-2 py-2 w-full h-40"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            파일 업로드(.txt/.json/.jsonl)
          </label>
          <input
            type="file"
            accept=".txt,.json,.jsonl"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <button
          onClick={() => ingestMut.mutate()}
          disabled={ingestMut.isPending}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          {ingestMut.isPending
            ? "인제스트 중..."
            : file
              ? "배치 인제스트"
              : "인제스트"}
        </button>

        {ingestMut.isSuccess && (
          <div className="mt-4 text-sm">
            <pre className="bg-muted rounded p-2 whitespace-pre-wrap">
              {JSON.stringify(ingestMut.data, null, 2)}
            </pre>
          </div>
        )}
        {ingestMut.isError && (
          <div className="mt-4 text-sm text-red-600">실패했습니다.</div>
        )}
      </main>
    </div>
  );
}
