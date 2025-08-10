"use client";

import { Nav } from "@/components/nav";
import { CollectionList } from "@/components/collection-list";

export default function CollectionsPage() {
  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Collections</h1>
        <CollectionList />
      </main>
    </div>
  );
}
