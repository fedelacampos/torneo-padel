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
  // Inscripción abierta si el torneo la tiene habilitada y alguna categoría todavía no se sorteó.
  const canRegister = t.registrationOpen && t.categories.some((c) => c.status === "REGISTRATION");
  const cat = selected ? await getCategoryFull(selected.id) : null;

  return (
    <>
      <Header complex={t.complex} />
      <AutoRefresh />
      <section className="hero">
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-7">
          <p className="text-xs font-semibold uppercase tracking-[.25em]" style={{ color: "var(--brand)" }}>
            {fmtDate(t.startDate)} al {fmtDate(t.endDate)}
          </p>
          <h1 className="font-display mt-1 text-4xl font-extrabold uppercase leading-none">{t.name}</h1>
          {canRegister && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={`/${slug}/inscripcion?torneo=${t.id}`} className="btn-primary px-6 py-3 text-base">Inscribirme</Link>
              <span className="chip bg-white/10 text-white ring-1 ring-white/20">Inscripción abierta</span>
            </div>
          )}
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-4 py-5">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {t.categories.map((c) => (
            <Link
              key={c.id}
              href={`?cat=${c.id}`}
              scroll={false}
              className={`shrink-0 ${c.id === selected?.id ? "chip-on" : "chip-off"}`}
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {cat && (
          <div className="mt-4">
            <p className="mb-5 text-xs text-neutral-500">
              {FORMAT_LABEL[cat.format]} · {MATCH_FORMAT_LABEL[cat.matchFormat as MatchFormat]} · <b>{STATUS_LABEL[cat.status]}</b>
            </p>
            <CategoryView cat={cat} />
          </div>
        )}
        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-neutral-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Resultados en vivo: se actualizan solos</p>
      </main>
    </>
  );
}
