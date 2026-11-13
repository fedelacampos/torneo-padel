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

function SetCell({ s, side }: { s: SetScore; side: "a" | "b" }) {
  const mine = side === "a" ? s.a : s.b;
  const other = side === "a" ? s.b : s.a;
  const won = mine > other;
  const tb = side === "a" ? s.tbA : s.tbB;
  const showTb = !s.super && tb != null && Math.max(s.a, s.b) === 7 && Math.min(s.a, s.b) === 6;
  return (
    <td className={`w-9 text-center tabular-nums ${s.super ? "bg-ball/60" : ""} ${won ? "font-bold" : "text-slate-500"}`}>
      {mine}
      {showTb && <sup className="ml-0.5 text-[10px] font-semibold text-slate-500">{tb}</sup>}
    </td>
  );
}

/** Tarjeta de partido con marcador por sets. Tiebreak en superíndice; supertiebreak resaltado. */
export function MatchCard({ m, label, empty = "A definir" }: { m: MatchView; label?: string; empty?: string }) {
  const sets = parseSets(m.sets);
  const hasSuper = sets.some((s) => s.super);
  const row = (side: "a" | "b") => {
    const pair = side === "a" ? m.pairA : m.pairB;
    const id = side === "a" ? m.pairAId : m.pairBId;
    const won = !!m.winnerId && m.winnerId === id;
    return (
      <tr className={won ? "text-slate-900" : m.winnerId ? "text-slate-500" : ""}>
        <td className={`py-1.5 pr-2 ${won ? "font-bold" : ""}`}>
          <span className="flex items-center gap-1.5">
            {won && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />}
            <span className="line-clamp-1">{pair ? pairName(pair) : empty}</span>
          </span>
        </td>
        {m.walkover ? (
          <td className="w-12 text-center text-xs font-bold">{won ? "W.O." : ""}</td>
        ) : (
          sets.map((s, i) => <SetCell key={i} s={s} side={side} />)
        )}
      </tr>
    );
  };
  return (
    <div className="card p-3">
      {(label || m.court || m.scheduledAt) && (
        <div className="mb-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
          {label && <span className="font-semibold uppercase tracking-wide">{label}</span>}
          {m.scheduledAt && <span>{fmtDateTime(m.scheduledAt)}</span>}
          {m.court && <span>Cancha {m.court}</span>}
          {!m.winnerId && m.pairA && m.pairB && <span className="ml-auto chip bg-amber-100 text-amber-800">Por jugar</span>}
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {row("a")}
          {row("b")}
        </tbody>
      </table>
      {hasSuper && <p className="mt-1 text-[11px] text-slate-500">Resaltado: supertiebreak a 10</p>}
    </div>
  );
}
