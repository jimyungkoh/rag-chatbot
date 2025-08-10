"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCollection, getCollections, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useState } from "react";

export function CollectionList() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.collections,
    queryFn: getCollections,
  });
  const [name, setName] = useState("");

  const createMut = useMutation({
    mutationFn: (n: string) => createCollection(n),
    onSuccess: async () => {
      setName("");
      await qc.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (n: string) => {
      await api.delete(`/chroma/collections/${encodeURIComponent(n)}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="새 컬렉션 이름"
          className="border rounded px-2 py-1"
        />
        <button
          onClick={() => name && createMut.mutate(name)}
          className="border rounded px-3 py-1"
        >
          생성
        </button>
      </div>
      {isLoading ? (
        <div>로딩중...</div>
      ) : (
        <ul className="divide-y">
          {(data || []).map((c) => (
            <li key={c} className="flex items-center justify-between py-2">
              <Link href={`/collections/${encodeURIComponent(c)}`} className="underline">
                {c}
              </Link>
              <button
                onClick={() => deleteMut.mutate(c)}
                className="text-red-600 hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
