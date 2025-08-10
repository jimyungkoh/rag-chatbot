"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { askAnswer } from "@/lib/api-client";
import { Nav } from "@/components/nav";

export default function PlaygroundPage() {
  const [collection, setCollection] = useState("conversations");
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);

  const askMut = useMutation({
    mutationFn: () => askAnswer({ collection, question, top_k: topK, include: ["documents", "metadatas", "distances"] }),
  });

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Playground</h1>
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm mb-1">Collection</label>
            <input value={collection} onChange={(e) => setCollection(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-sm mb-1">Top K</label>
            <input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="border rounded px-2 py-1 w-full" />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">질문</label>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} className="border rounded px-2 py-2 w-full h-28" placeholder="질문을 입력하세요" />
        </div>

        <button
          onClick={() => question && askMut.mutate()}
          disabled={askMut.isPending || !question}
          className="border rounded px-3 py-1 disabled:opacity-50"
        >
          {askMut.isPending ? "요청 중..." : "질문하기"}
        </button>

        {askMut.isError && (
          <div className="mt-4 text-red-600 text-sm">오류가 발생했습니다.</div>
        )}
        {askMut.isSuccess && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-3">
              <h2 className="font-semibold mb-2">답변</h2>
              <pre className="whitespace-pre-wrap text-sm">{askMut.data.answer}</pre>
            </div>
            <div className="border rounded p-3">
              <h2 className="font-semibold mb-2">컨텍스트</h2>
              <ul className="text-sm space-y-2">
                {askMut.data.contexts.map((c) => (
                  <li key={c.id} className="border rounded p-2">
                    <div className="text-xs text-muted-foreground mb-1">{c.id} (distance: {c.distance ?? "-"})</div>
                    <div className="whitespace-pre-wrap">{c.document}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
