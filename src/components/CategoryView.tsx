import { americanoStandings, zoneStandings, type CategoryFull } from "@/lib/tournament";
import { MatchCard } from "./MatchCard";
import { ZoneTable } from "./ZoneTable";
import { Bracket } from "./Bracket";
import { qualifiersFor } from "@/lib/draw";

/** Vista pública de una categoría: zonas con tablas, partidos y cuadro. */
export function CategoryView({ cat }: { cat: CategoryFull }) {
  const ko = cat.matches.filter((m) => m.stage === "KO");

  // Durante la inscripción la lista de parejas es solo para el organizador.
  if (cat.status === "REGISTRATION") return null;


  const bracket = (
    <section>
      <h2 className="h2 mb-1">{cat.status === "ZONES" ? "Cuadro final" : "Cuadro"}</h2>
      {cat.status === "ZONES" && <p className="mb-3 text-xs text-neutral-500">Se completa solo cuando terminan las zonas.</p>}
      <Bracket matches={ko} />
    </section>
  );

  return (
    <div className="space-y-6">
      {ko.length > 0 && cat.status !== "ZONES" && bracket}

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

      {cat.zones.length > 0 && (
        <section>
          <h2 className="h2 mb-3">Zonas</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {zoneStandings(cat).map(({ zone, rows }) => (
              <div key={zone.id} className="space-y-2">
                <ZoneTable title={zone.name} rows={rows} pairs={zone.pairs} qualify={qualifiersFor(zone.pairs.length)} />
                {cat.matches.filter((m) => m.zoneId === zone.id).map((m) => <MatchCard key={m.id} m={m} />)}
              </div>
            ))}
          </div>
        </section>
      )}
      {ko.length > 0 && cat.status === "ZONES" && bracket}
    </div>
  );
}
