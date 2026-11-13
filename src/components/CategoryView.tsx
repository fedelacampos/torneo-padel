import Link from "next/link";
import { americanoStandings, zoneStandings, type CategoryFull } from "@/lib/tournament";
import { MatchCard } from "./MatchCard";
import { ZoneTable } from "./ZoneTable";
import { Bracket } from "./Bracket";
import { qualifiersFor } from "@/lib/draw";

export type CategoryTab = "zonas" | "cuadro";

/**
 * Vista pública de una categoría. En "Zonas + fase final" hay dos pestañas, ZONAS y CUADRO FINAL,
 * visibles desde el sorteo. Por defecto: ZONAS mientras se juegan las zonas, CUADRO FINAL después.
 */
export function CategoryView({ cat, tab }: { cat: CategoryFull; tab?: string }) {
  const ko = cat.matches.filter((m) => m.stage === "KO");

  // Durante la inscripción la lista de parejas es solo para el organizador.
  if (cat.status === "REGISTRATION") return null;

  const zonesView = cat.zones.length > 0 && (
    <div className="grid gap-5 md:grid-cols-2">
      {zoneStandings(cat).map(({ zone, rows }) => (
        <div key={zone.id} className="space-y-2">
          <ZoneTable title={zone.name} rows={rows} pairs={zone.pairs} qualify={qualifiersFor(zone.pairs.length)} />
          {cat.matches.filter((m) => m.zoneId === zone.id).map((m) => <MatchCard key={m.id} m={m} />)}
        </div>
      ))}
    </div>
  );

  const bracketView = ko.length > 0 && (
    <div>
      {cat.status === "ZONES" && (
        <p className="mb-3 rounded-xl bg-white p-3 text-xs text-neutral-600 ring-1 ring-black/5">
          Los lugares se completan solos con los clasificados cuando terminan las zonas.
        </p>
      )}
      <Bracket matches={ko} />
    </div>
  );

  // Zonas + fase final: dos pestañas.
  if (zonesView && bracketView) {
    const current: CategoryTab = tab === "cuadro" || tab === "zonas" ? tab : cat.status === "ZONES" ? "zonas" : "cuadro";
    const tabLink = (t: CategoryTab, label: string) => (
      <Link
        href={`?cat=${cat.id}&vista=${t}`}
        scroll={false}
        className={`font-display flex-1 rounded-xl py-3 text-center text-lg font-bold uppercase tracking-wide transition ${
          current === t ? "bg-[var(--ink)] shadow" : "text-neutral-500 hover:text-neutral-900"
        }`}
        style={current === t ? { color: "var(--brand)" } : undefined}
        aria-current={current === t ? "page" : undefined}
      >
        {label}
      </Link>
    );
    return (
      <div>
        <nav className="sticky top-[60px] z-10 -mx-4 mb-5 bg-[var(--paper)] px-4 py-2">
          <div className="flex gap-1 rounded-2xl bg-white p-1 ring-1 ring-black/10">
            {tabLink("zonas", "Zonas")}
            {tabLink("cuadro", "Cuadro final")}
          </div>
        </nav>
        {current === "zonas" ? zonesView : bracketView}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bracketView && (
        <section>
          <h2 className="h2 mb-3">Cuadro</h2>
          {bracketView}
        </section>
      )}
      {cat.format === "AMERICANO" && (
        <section className="space-y-3">
          <h2 className="h2">Tabla</h2>
          <ZoneTable title="Posiciones" rows={americanoStandings(cat)} pairs={cat.pairs} qualify={1} />
          <h2 className="h2 pt-2">Partidos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {cat.matches.filter((m) => m.stage === "AMERICANO").map((m) => <MatchCard key={m.id} m={m} />)}
          </div>
        </section>
      )}
    </div>
  );
}
