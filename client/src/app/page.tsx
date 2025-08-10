import { Nav } from "@/components/nav";

export default function Home() {
  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded p-4">컬렉션 수</div>
          <div className="border rounded p-4">총 벡터 수</div>
          <div className="border rounded p-4">최근 인제스트</div>
        </div>
      </main>
    </div>
  );
}
