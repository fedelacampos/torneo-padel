import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { AutoRefresh } from "@/components/AutoRefresh";
import { CategoryView } from "@/components/CategoryView";
import { getCategoryFull, FORMAT_LABEL, STATUS_LABEL } from "@/lib/tournament";
import { MATCH_FORMAT_LABEL, type MatchFormat } from "@/lib/scoring";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  params, searchParams,
}: { params: Promise<{ complex: string; id: string }>; searchParams: Promise<{ cat?: string }> }) {
  const { complex: slug, id } = await params;
  const { cat: catId } = await searchParams;
  const t = await db.tournament.findUnique({
    where: { id },
    include: { complex: true, categories: { orderBy: { name: "asc" } } },
  });
  if (!t || t.complex.slug !== slug) notFound();
  const selected = t.categories.find((c) => c.id === catId) ?? t.categories[0];
  const cat = selected ? await getCategoryFull(selected.id) : null;

  return (
    <>
      <Header complex={t.complex} />
      <AutoRefresh />
      <main className="mx-auto max-w-5xl px-4 py-5">
        <h1 className="h1">{t.name}</h1>
        <p className="text-sm text-slate-500">{fmtDate(t.startDate)} al {fmtDate(t.endDate)}</p>

        <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {t.categories.map((c) => (
            <Link
              key={c.id}
              href={`?cat=${c.id}`}
              scroll={false}
              className={`chip shrink-0 px-4 py-2 text-sm ${c.id === selected?.id ? "text-white" : "bg-white ring-1 ring-slate-200"}`}
              style={c.id === selected?.id ? { background: "var(--brand)" } : undefined}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {cat && (
          <div className="mt-4">
            <p className="mb-4 text-xs text-slate-500">
              {FORMAT_LABEL[cat.format]} · {MATCH_FORMAT_LABEL[cat.matchFormat as MatchFormat]} · <b>{STATUS_LABEL[cat.status]}</b>
            </p>
            <CategoryView cat={cat} />
          </div>
        )}
        <p className="mt-8 text-center text-xs text-slate-400">Los resultados se actualizan solos.</p>
      </main>
    </>
  );
}
