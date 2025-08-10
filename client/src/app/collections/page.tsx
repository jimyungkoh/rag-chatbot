"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createCollection, getCollections } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useState } from "react";
import { Nav } from "@/components/nav";

export default function CollectionsPage() {
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

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Collections</h1>
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
          <ul className="list-disc pl-5">
            {(data || []).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
