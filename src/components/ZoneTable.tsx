import type { StandingRow } from "@/lib/draw";
import { pairName } from "@/lib/format";

type P = { id: string; player1: { fullName: string }; player2: { fullName: string } };

export function ZoneTable({ title, rows, pairs, qualify }: { title: string; rows: StandingRow[]; pairs: P[]; qualify: number }) {
  const byId = new Map(pairs.map((p) => [p.id, p]));
  return (
    <div className="card overflow-hidden">
      <div className="bg-slate-800 px-3 py-2 text-sm font-bold text-white">{title}</div>
      <table className="w-full text-sm">
        <thead className="text-xs text-slate-500">
          <tr>
            <th className="px-3 py-1.5 text-left">Pareja</th>
            <th className="w-8">PJ</th>
            <th className="w-8">PG</th>
            <th className="w-10">Sets</th>
            <th className="w-12">Games</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.pairId} className={`border-t border-slate-100 ${i < qualify ? "bg-emerald-50" : ""}`}>
              <td className="px-3 py-2">
                <span className="mr-1.5 text-xs text-slate-400">{i + 1}</span>
                {pairName(byId.get(r.pairId))}
              </td>
              <td className="text-center tabular-nums">{r.played}</td>
              <td className="text-center font-bold tabular-nums">{r.won}</td>
              <td className="text-center tabular-nums">{fmtDiff(r.setsFor - r.setsAgainst)}</td>
              <td className="text-center tabular-nums">{fmtDiff(r.gamesFor - r.gamesAgainst)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fmtDiff(n: number) {
  return n > 0 ? `+${n}` : String(n);
}
