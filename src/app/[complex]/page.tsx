import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
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
  const active = complex.tournaments.filter((t) => t.endDate.getTime() + 864e5 >= now);
  const past = complex.tournaments.filter((t) => t.endDate.getTime() + 864e5 < now);

  const card = (t: (typeof complex.tournaments)[number]) => (
    <Link key={t.id} href={`/${slug}/torneo/${t.id}`} className="card block p-4 hover:ring-[var(--brand)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold">{t.name}</p>
          <p className="text-sm text-slate-500">{fmtDate(t.startDate)} al {fmtDate(t.endDate)}</p>
        </div>
        {t.registrationOpen && <span className="chip bg-emerald-100 text-emerald-800">Inscripción abierta</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {t.categories.map((c) => <span key={c.id} className="chip bg-slate-100 text-slate-700">{c.name}</span>)}
      </div>
    </Link>
  );

  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={`/${slug}/inscripcion`} className="btn-primary py-4 text-base">Inscribirme a un torneo</Link>
          <Link href={`/${slug}/ranking`} className="btn-ghost py-4 text-base">Ver ranking {new Date().getFullYear()}</Link>
        </div>
        <section>
          <h2 className="h2 mb-3">Torneos</h2>
          <div className="grid gap-3 sm:grid-cols-2">{active.map(card)}</div>
          {active.length === 0 && <p className="text-sm text-slate-500">No hay torneos en curso.</p>}
        </section>
        {past.length > 0 && (
          <section>
            <h2 className="h2 mb-3">Torneos anteriores</h2>
            <div className="grid gap-3 sm:grid-cols-2">{past.map(card)}</div>
          </section>
        )}
      </main>
    </>
  );
}
