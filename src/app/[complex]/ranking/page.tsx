import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { computeRanking } from "@/lib/tournament";
import { parsePoints, POINTS_LABEL, type RankingPoints } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  params, searchParams,
}: { params: Promise<{ complex: string }>; searchParams: Promise<{ year?: string; cat?: string }> }) {
  const { complex: slug } = await params;
  const sp = await searchParams;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  const thisYear = new Date().getFullYear();
  const year = Number(sp.year) || thisYear;
  const ranking = await computeRanking(complex.id, year);
  const cats = Object.keys(ranking);
  const cat = sp.cat && ranking[sp.cat] ? sp.cat : cats[0];
  const rows = cat ? ranking[cat] : [];
  const pts = parsePoints(complex.rankingPoints);

  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-3xl px-4 py-5">
        <div className="flex items-center justify-between">
          <h1 className="h1">Ranking {year}</h1>
          <div className="flex gap-1 text-sm">
            <Link className="btn-ghost px-3 py-1.5" href={`?year=${year - 1}`}>‹ {year - 1}</Link>
            {year < thisYear && <Link className="btn-ghost px-3 py-1.5" href={`?year=${year + 1}`}>{year + 1} ›</Link>}
          </div>
        </div>

        <nav className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {cats.map((c) => (
            <Link key={c} href={`?year=${year}&cat=${encodeURIComponent(c)}`}
              className={`chip shrink-0 px-4 py-2 text-sm ${c === cat ? "text-white" : "bg-white ring-1 ring-slate-200"}`}
              style={c === cat ? { background: "var(--brand)" } : undefined}>{c}</Link>
          ))}
        </nav>

        {rows.length === 0 ? (
          <p className="mt-6 text-slate-500">Todavía no hay torneos finalizados en {year}.</p>
        ) : (
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-xs text-white">
                <tr><th className="w-10 py-2">#</th><th className="text-left">Jugador</th><th className="w-14">Torneos</th><th className="w-16 pr-3 text-right">Puntos</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.playerId} className="border-t border-slate-100">
                    <td className="py-2.5 text-center font-bold text-slate-400">{i + 1}</td>
                    <td>
                      <div className="font-medium">{r.name}</div>
                      {r.instagram && <div className="text-xs text-slate-500">{r.instagram}</div>}
                    </td>
                    <td className="text-center tabular-nums">{r.tournaments}</td>
                    <td className="pr-3 text-right text-base font-bold tabular-nums">{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="card mt-6 p-4 text-sm">
          <summary className="cursor-pointer font-semibold">¿Cómo se suman los puntos?</summary>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {(Object.keys(POINTS_LABEL) as (keyof RankingPoints)[]).map((k) => (
              <li key={k} className="flex justify-between rounded bg-slate-50 px-2 py-1"><span>{POINTS_LABEL[k]}</span><b>{pts[k]}</b></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Cada jugador suma los puntos de la instancia a la que llegó con su pareja.</p>
        </details>
      </main>
    </>
  );
}
