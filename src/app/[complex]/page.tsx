import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header, Logo } from "@/components/Header";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ComplexHome({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({
    where: { slug },
    include: { tournaments: { orderBy: { startDate: "desc" }, include: { categories: true } } },
  });
  if (!complex) notFound();
  const now = Date.now();
  const isLive = (t: { startDate: Date; endDate: Date }) => t.startDate.getTime() <= now && t.endDate.getTime() + 864e5 >= now;
  const active = complex.tournaments.filter((t) => t.endDate.getTime() + 864e5 >= now);
  const past = complex.tournaments.filter((t) => t.endDate.getTime() + 864e5 < now);

  const card = (t: (typeof complex.tournaments)[number]) => (
    <Link key={t.id} href={`/${slug}/torneo/${t.id}`} className="card group relative block overflow-hidden p-4 pl-5 transition hover:-tranneutral-y-0.5 hover:shadow-md">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: isLive(t) ? "var(--brand)" : "var(--ink)" }} />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl font-bold uppercase leading-tight">{t.name}</p>
          <p className="text-sm text-neutral-500">{fmtDate(t.startDate)} al {fmtDate(t.endDate)}</p>
        </div>
        {isLive(t) ? (
          <span className="chip-brand gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--brand-ink)]" />En juego</span>
        ) : t.registrationOpen ? (
          <span className="chip bg-[var(--ink)] text-white">Inscripción abierta</span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {t.categories.map((c) => <span key={c.id} className="chip bg-neutral-100 text-neutral-700">{c.name}</span>)}
      </div>
      <span className="absolute bottom-3 right-4 text-lg text-neutral-300 transition group-hover:tranneutral-x-1 group-hover:text-neutral-900">→</span>
    </Link>
  );

  return (
    <>
      <Header complex={complex} />
      <section className="hero">
        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:text-left">
          <Logo complex={complex} size={112} />
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[.25em]" style={{ color: "var(--brand)" }}>Torneos de pádel</p>
            <h1 className="font-display mt-1 text-4xl font-extrabold uppercase leading-none sm:text-5xl">{complex.name}</h1>
            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link href={`/${slug}/inscripcion`} className="btn-primary px-5 py-3 text-base">Inscribirme</Link>
              <Link href={`/${slug}/ranking`} className="btn-outline-light px-5 py-3 text-base">Ranking {new Date().getFullYear()}</Link>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section>
          <h2 className="h2 mb-3">Torneos</h2>
          <div className="grid gap-3 sm:grid-cols-2">{active.map(card)}</div>
          {active.length === 0 && <p className="text-sm text-neutral-500">No hay torneos en curso.</p>}
        </section>
        {past.length > 0 && (
          <section>
            <h2 className="h2 mb-3">Torneos anteriores</h2>
            <div className="grid gap-3 sm:grid-cols-2">{past.map(card)}</div>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-neutral-400">
        <Link href={`/${slug}/admin`} className="hover:text-neutral-700">Ingreso organizador</Link>
      </footer>
    </>
  );
}
