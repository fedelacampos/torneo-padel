import { roundLabel } from "@/lib/draw";
import { MatchCard, type MatchView } from "./MatchCard";

/** Cuadro de eliminación: una columna por ronda, con scroll horizontal en el celular. */
export function Bracket({ matches }: { matches: (MatchView & { round: number; position: number })[] }) {
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => b - a);
  if (rounds.length === 0) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex gap-4" style={{ minWidth: rounds.length * 260 }}>
        {rounds.map((r) => (
          <div key={r} className="flex w-64 shrink-0 flex-col">
            <h3 className="font-display mb-3 rounded-lg bg-[var(--ink)] py-1.5 text-center text-sm font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>{roundLabel(r)}</h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {matches
                .filter((m) => m.round === r)
                .sort((a, b) => a.position - b.position)
                .map((m) => {
                  return <MatchCard key={m.id} m={m} empty="A definir" />;
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
