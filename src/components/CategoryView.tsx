import { americanoStandings, zoneStandings, type CategoryFull } from "@/lib/tournament";
import { MatchCard } from "./MatchCard";
import { ZoneTable } from "./ZoneTable";
import { Bracket } from "./Bracket";

/** Vista pública de una categoría: zonas con tablas, partidos y cuadro. */
export function CategoryView({ cat }: { cat: CategoryFull }) {
  const ko = cat.matches.filter((m) => m.stage === "KO");
  const confirmed = cat.pairs.filter((p) => p.status === "CONFIRMED");

  if (cat.status === "REGISTRATION") {
    return (
      <div className="card p-4">
        <p className="font-semibold">Inscripción abierta</p>
        <p className="text-sm text-slate-600">{confirmed.length} parejas confirmadas. El sorteo se publica antes del torneo.</p>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {confirmed.map((p) => (
            <li key={p.id} className="rounded-lg bg-slate-50 px-3 py-1.5">{p.player1.fullName} / {p.player2.fullName}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ko.length > 0 && (
        <section>
          <h2 className="h2 mb-3">Cuadro</h2>
          <Bracket matches={ko} />
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

      {cat.zones.length > 0 && (
        <section>
          <h2 className="h2 mb-3">Zonas</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {zoneStandings(cat).map(({ zone, rows }) => (
              <div key={zone.id} className="space-y-2">
                <ZoneTable title={zone.name} rows={rows} pairs={zone.pairs} qualify={cat.qualifiersPerZone} />
                {cat.matches.filter((m) => m.zoneId === zone.id).map((m) => <MatchCard key={m.id} m={m} />)}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
