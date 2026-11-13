import { parseSets, type SetScore } from "@/lib/scoring";
import { fmtDateTime, pairName } from "@/lib/format";

type P = { id: string; player1: { fullName: string }; player2: { fullName: string } } | null;
export type MatchView = {
  id: string;
  pairA: P;
  pairB: P;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
  sets: string | null;
  walkover: boolean;
  court: string | null;
  scheduledAt: Date | null;
};

/** Casilla de un set. Ganador del set: fondo negro. Supertiebreak: fondo del color del complejo. */
function SetCell({ s, side }: { s: SetScore; side: "a" | "b" }) {
  const mine = side === "a" ? s.a : s.b;
  const other = side === "a" ? s.b : s.a;
  const won = mine > other;
  const tb = side === "a" ? s.tbA : s.tbB;
  const showTb = !s.super && tb != null && Math.max(s.a, s.b) === 7 && Math.min(s.a, s.b) === 6;
  const style = s.super
    ? won ? { background: "var(--brand)", color: "var(--brand-ink)" } : { background: "color-mix(in srgb, var(--brand) 25%, white)" }
    : undefined;
  return (
    <td className="py-0.5 pl-1">
      <span
        className={`font-display relative grid h-8 w-8 place-items-center rounded-md text-lg font-bold tabular-nums ${s.super ? "" : won ? "bg-[var(--ink)] text-white" : "bg-neutral-100 text-neutral-500"}`}
        style={style}
      >
        {mine}
        {showTb && <sup className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-white px-0.5 text-[10px] font-bold text-neutral-700 ring-1 ring-black/10">{tb}</sup>}
      </span>
    </td>
  );
}

/** Tarjeta de partido estilo marcador: los games de cada set, el tiebreak como globito y el supertiebreak resaltado. */
export function MatchCard({ m, label, empty = "A definir" }: { m: MatchView; label?: string; empty?: string }) {
  const sets = parseSets(m.sets);
  const hasSuper = sets.some((s) => s.super);
  const pending = !m.winnerId && m.pairA && m.pairB;
  const row = (side: "a" | "b") => {
    const pair = side === "a" ? m.pairA : m.pairB;
    const id = side === "a" ? m.pairAId : m.pairBId;
    const won = !!m.winnerId && m.winnerId === id;
    return (
      <tr>
        <td className="w-full py-1 pr-2">
          <span className={`flex items-center gap-2 ${won ? "font-bold text-neutral-900" : m.winnerId ? "text-neutral-500" : "text-neutral-800"}`}>
            <span className="h-4 w-1 shrink-0 rounded-full" style={{ background: won ? "var(--brand)" : "transparent", boxShadow: won ? "0 0 0 1px rgba(0,0,0,.15)" : undefined }} />
            <span className="line-clamp-1">{pair ? pairName(pair) : <span className="italic text-neutral-400">{empty}</span>}</span>
          </span>
        </td>
        {m.walkover ? (
          <td className="pl-1">{won && <span className="font-display rounded-md bg-[var(--ink)] px-2 py-1 text-sm font-bold text-white">W.O.</span>}</td>
        ) : (
          sets.map((s, i) => <SetCell key={i} s={s} side={side} />)
        )}
      </tr>
    );
  };
  return (
    <div className="card p-3">
      {(label || m.court || m.scheduledAt || pending) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {label && <span>{label}</span>}
          {m.scheduledAt && <span>{fmtDateTime(m.scheduledAt)}</span>}
          {m.court && <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-700">Cancha {m.court}</span>}
          {pending && <span className="ml-auto chip-brand">Por jugar</span>}
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {row("a")}
          {row("b")}
        </tbody>
      </table>
      {hasSuper && <p className="mt-1.5 text-[11px] text-neutral-500">3er set: supertiebreak a 10</p>}
    </div>
  );
}
