"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/collections", label: "Collections" },
  { href: "/playground", label: "Playground" },
  { href: "/ingest", label: "Ingest" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b">
      <div className="mx-auto max-w-6xl px-4 h-12 flex items-center gap-4">
        <div className="font-semibold">RAG Console</div>
        <ul className="flex items-center gap-3 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "px-2 py-1 rounded hover:text-foreground",
                  pathname === item.href && "text-foreground bg-muted"
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
