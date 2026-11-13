import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const complexes = await db.complex.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <img src="/icon.svg" alt="" className="mb-4 h-14 w-14" />
      <h1 className="h1">PadelTorneos</h1>
      <p className="mt-1 text-neutral-600">Inscripciones, zonas, cuadros, resultados en vivo y ranking anual.</p>
      <h2 className="h2 mt-8 mb-3">Complejos</h2>
      <div className="space-y-2">
        {complexes.map((c) => (
          <Link key={c.id} href={`/${c.slug}`} className="card flex items-center justify-between p-4 hover:ring-black/30">
            <span className="font-semibold">{c.name}</span>
            <span aria-hidden>›</span>
          </Link>
        ))}
        {complexes.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay complejos. Ejecutá <code>npm run db:seed</code>.</p>}
      </div>
    </main>
  );
}
