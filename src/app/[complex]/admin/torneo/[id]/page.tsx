import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { getCategoryFull } from "@/lib/tournament";
import { fmtDate } from "@/lib/format";
import { CategoriesTab } from "./CategoriesTab";
import { PairsTab } from "./PairsTab";
import { PaymentsTab } from "./PaymentsTab";
import { MatchesTab } from "./MatchesTab";
import { WhatsappTab } from "./WhatsappTab";

export const dynamic = "force-dynamic";

const TABS = [
  ["categorias", "Categorías"],
  ["parejas", "Parejas"],
  ["partidos", "Partidos"],
  ["pagos", "Pagos"],
  ["whatsapp", "WhatsApp"],
] as const;

export default async function AdminTournament({
  params, searchParams,
}: { params: Promise<{ complex: string; id: string }>; searchParams: Promise<{ tab?: string; cat?: string }> }) {
  const { complex: slug, id } = await params;
  const sp = await searchParams;
  const complex = await requireAdmin(slug);
  const t = await db.tournament.findUnique({ where: { id }, include: { categories: { orderBy: { name: "asc" } } } });
  if (!t || t.complexId !== complex.id) notFound();

  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "categorias";
  const selected = t.categories.find((c) => c.id === sp.cat) ?? t.categories[0];
  const needsCat = tab === "parejas" || tab === "partidos";
  const cat = needsCat && selected ? await getCategoryFull(selected.id) : null;
  const q = (o: { tab?: string; cat?: string }) => `?tab=${o.tab ?? tab}${(o.cat ?? selected?.id) ? `&cat=${o.cat ?? selected?.id}` : ""}`;

  return (
    <>
      <Header complex={complex} admin />
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Link href={`/${slug}/admin`} className="text-sm text-neutral-500">‹ Torneos</Link>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="h1">{t.name}</h1>
            <p className="text-sm text-neutral-500">{fmtDate(t.startDate)} al {fmtDate(t.endDate)}</p>
          </div>
          <Link href={`/${slug}/torneo/${t.id}`} target="_blank" className="btn-ghost px-3 py-1.5">Ver página pública ↗</Link>
        </div>

        <nav className="-mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4">
          {TABS.map(([k, label]) => (
            <Link key={k} href={q({ tab: k })}
              className={`shrink-0 border-b-[3px] px-3 py-2 text-sm font-semibold ${k === tab ? "border-[var(--ink)] text-neutral-900" : "border-transparent text-neutral-500"}`}>
              {label}
            </Link>
          ))}
        </nav>

        {needsCat && t.categories.length > 0 && (
          <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {t.categories.map((c) => (
              <Link key={c.id} href={q({ cat: c.id })}
                className={`shrink-0 ${c.id === selected?.id ? "chip-on" : "chip-off"}`}>{c.name}</Link>
            ))}
          </nav>
        )}

        <div className="mt-4">
          {tab === "categorias" && <CategoriesTab slug={slug} tournament={t} />}
          {needsCat && !cat && <p className="text-neutral-500">Primero agregá una categoría.</p>}
          {tab === "parejas" && cat && <PairsTab slug={slug} cat={cat} />}
          {tab === "partidos" && cat && <MatchesTab slug={slug} cat={cat} />}
          {tab === "pagos" && <PaymentsTab slug={slug} tournamentId={t.id} fee={t.entryFee} />}
          {tab === "whatsapp" && <WhatsappTab complex={complex} tournamentId={t.id} />}
        </div>
      </main>
    </>
  );
}
