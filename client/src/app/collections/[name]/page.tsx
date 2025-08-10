"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addDocuments, getCollectionDocs, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";

export default function CollectionDetailPage() {
  const { name } = useParams<{ name: string }>();
  const decName = useMemo(() => decodeURIComponent(name), [name]);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.collectionDocs(decName),
    queryFn: () => getCollectionDocs({ name: decName, limit: 50, include: ["documents", "metadatas"] }),
  });

  const { data: stats } = useQuery({
    queryKey: ["collectionStats", decName],
    queryFn: async () => (await api.get(`/chroma/collections/${encodeURIComponent(decName)}/stats`)).data as { count: number; dimension?: number },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post(`/chroma/collections/${encodeURIComponent(decName)}/delete`, { ids });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.collectionDocs(decName) });
      await qc.invalidateQueries({ queryKey: ["collectionStats", decName] });
    },
  });

  const [text, setText] = useState("");
  const addTextMut = useMutation({
    mutationFn: async (t: string) => {
      const id = crypto.randomUUID();
      return addDocuments(decName, { ids: [id], documents: [t] });
    },
    onSuccess: async () => {
      setText("");
      await qc.invalidateQueries({ queryKey: queryKeys.collectionDocs(decName) });
      await qc.invalidateQueries({ queryKey: ["collectionStats", decName] });
    },
  });

  return (
    <div>
      <Nav />
      <main className="px-4 py-6 mx-auto max-w-6xl">
        <div className="flex gap-2 items-center mb-4 text-sm text-muted-foreground">
          <Link href="/collections" className="underline">Collections</Link>
          <span>/</span>
          <span className="text-foreground">{decName}</span>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div className="p-4 rounded border">
            <div className="text-sm text-muted-foreground">문서 수</div>
            <div className="text-2xl font-semibold">{stats?.count ?? '-'}</div>
          </div>
          <div className="p-4 rounded border">
            <div className="text-sm text-muted-foreground">임베딩 차원</div>
            <div className="text-2xl font-semibold">{stats?.dimension ?? '-'}</div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="mb-2 font-semibold">텍스트 추가</h2>
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="문서를 입력하세요"
              className="px-2 py-1 w-full h-24 rounded border"
            />
            <button
              onClick={() => text && addTextMut.mutate(text)}
              className="px-3 py-1 rounded border min-w-24"
            >
              추가
            </button>
          </div>
        </div>

        <h2 className="mb-2 font-semibold">문서 목록</h2>
        {isLoading ? (
          <div>로딩중...</div>
        ) : (
          <DocsTable data={data} onDelete={(ids) => deleteMut.mutate(ids)} />
        )}
      </main>
    </div>
  );
}

import type { ChromaGetResult } from "@/lib/types";

function DocsTable({ data, onDelete }: { data: ChromaGetResult | undefined; onDelete: (ids: string[]) => void }) {
  const ids: string[] = data?.ids || [];
  const docs: (string | null)[] = data?.documents || [];
  const metas: Record<string, unknown>[] = data?.metadatas || [];
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const allRows = ids.map((id: string, i: number) => ({ id, doc: docs[i], meta: metas[i] }));
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const checkedIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);

  return (
    <div>
      <div className="flex gap-2 items-center mb-2">
        <button
          className="px-3 py-1 rounded border disabled:opacity-50"
          onClick={() => onDelete(checkedIds)}
          disabled={checkedIds.length === 0}
        >
          선택 삭제
        </button>
      </div>
      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left bg-muted">
              <th className="p-2">선택</th>
              <th className="p-2">ID</th>
              <th className="p-2">문서</th>
              <th className="p-2">메타데이터</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => (
              <tr key={row.id} className="align-top border-t">
                <td className="p-2">
                  <input type="checkbox" checked={!!selected[row.id]} onChange={() => toggle(row.id)} />
                </td>
                <td className="p-2 font-mono text-xs whitespace-nowrap">{row.id}</td>
                <td className="p-2 whitespace-pre-wrap">{row.doc}</td>
                <td className="p-2">
                  <pre className="overflow-x-auto p-2 text-xs rounded bg-muted">{JSON.stringify(row.meta, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
