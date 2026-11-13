"use client";
import { useActionState, useState } from "react";
import { validateMatch, type MatchFormat, type SetScore } from "@/lib/scoring";

type State = { error?: string; ok?: string } | undefined;
type Row = { a: string; b: string; tbA: string; tbB: string };

const empty: Row = { a: "", b: "", tbA: "", tbB: "" };

function toRows(sets: SetScore[]): Row[] {
  const rows = sets.map((s) => ({ a: String(s.a), b: String(s.b), tbA: s.tbA != null ? String(s.tbA) : "", tbB: s.tbB != null ? String(s.tbB) : "" }));
  while (rows.length < 3) rows.push({ ...empty });
  return rows;
}

const num = (v: string) => (v === "" ? NaN : Number(v));

/** Carga de resultado set por set, con tiebreak (7-6) y supertiebreak según el formato. */
export function ResultForm({
  slug, matchId, format, nameA, nameB, initial, walkover, hasResult, save, clear,
}: {
  slug: string; matchId: string; format: MatchFormat; nameA: string; nameB: string;
  initial: SetScore[]; walkover: "A" | "B" | null; hasResult: boolean;
  save: (s: State, fd: FormData) => Promise<State>;
  clear: (s: State, fd: FormData) => Promise<State>;
}) {
  const [rows, setRows] = useState<Row[]>(toRows(initial));
  const [wo, setWo] = useState<"" | "A" | "B">(walkover ?? "");
  const [state, run, pending] = useActionState(save, undefined);
  const [cState, runClear, clearing] = useActionState(clear, undefined);

  const isTb = (r: Row) => (num(r.a) === 7 && num(r.b) === 6) || (num(r.a) === 6 && num(r.b) === 7);
  // ¿Hace falta 3er set? Solo si los dos primeros quedaron 1-1.
  const w = (r: Row) => (num(r.a) > num(r.b) ? "A" : num(r.b) > num(r.a) ? "B" : null);
  const needThird = w(rows[0]) && w(rows[1]) && w(rows[0]) !== w(rows[1]);
  const superThird = format === "SUPER_TB";

  const sets: SetScore[] = rows.slice(0, needThird ? 3 : 2).map((r, i) => {
    const s: SetScore = { a: num(r.a), b: num(r.b) };
    if (i === 2 && superThird) s.super = true;
    else if (isTb(r)) { s.tbA = num(r.tbA); s.tbB = num(r.tbB); }
    return s;
  });
  const check = wo ? null : validateMatch(sets, format);

  const set = (i: number, k: keyof Row, v: string) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v.replace(/\D/g, "").slice(0, 2) } : r)));

  const input = (i: number, k: keyof Row, cls = "") => (
    <input
      inputMode="numeric"
      value={rows[i][k]}
      onChange={(e) => set(i, k, e.target.value)}
      className={`h-11 w-11 rounded-lg border border-slate-300 text-center text-lg font-semibold tabular-nums outline-none focus:border-[var(--brand)] ${cls}`}
      aria-label={`Set ${i + 1} ${k}`}
    />
  );

  const visible = needThird ? 3 : 2;
  return (
    <form action={run} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="sets" value={JSON.stringify(sets)} />
      <input type="hidden" name="walkover" value={wo} />

      {!wo && (
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th />
                {Array.from({ length: visible }, (_, i) => (
                  <th key={i} className="px-1 pb-1 font-medium">{i === 2 && superThird ? "Super TB" : `Set ${i + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["a", "b"] as const).map((side) => (
                <tr key={side}>
                  <td className="max-w-[9rem] truncate pr-2 font-medium">{side === "a" ? nameA : nameB}</td>
                  {Array.from({ length: visible }, (_, i) => (
                    <td key={i} className="px-1 py-0.5">
                      <div className="flex items-center gap-1">
                        {input(i, side, i === 2 && superThird ? "bg-ball/40" : "")}
                        {!(i === 2 && superThird) && isTb(rows[i]) && input(i, side === "a" ? "tbA" : "tbB", "h-9 w-9 text-sm bg-slate-50")}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.slice(0, visible).some((r, i) => isTb(r) && !(i === 2 && superThird)) && (
            <p className="mt-1 text-xs text-slate-500">Casilla chica: puntos del tiebreak (ej. 7-5).</p>
          )}
          {needThird && superThird && <p className="mt-1 text-xs text-slate-500">Supertiebreak a 10 con diferencia de 2 (10-8, 11-9...).</p>}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">W.O. (no se presentó):</span>
        <select value={wo} onChange={(e) => setWo(e.target.value as "" | "A" | "B")} className="rounded-lg border border-slate-300 px-2 py-1">
          <option value="">No</option>
          <option value="A">Gana {nameA}</option>
          <option value="B">Gana {nameB}</option>
        </select>
      </label>

      {check && !check.ok && rows.some((r) => r.a || r.b) && <p className="text-xs text-amber-700">{check.error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={pending || (!wo && !check?.ok)}>{pending ? "Guardando..." : "Guardar resultado"}</button>
        {hasResult && (
          <button formAction={runClear} className="btn-ghost" disabled={clearing}>Borrar</button>
        )}
      </div>
      {(state?.error || cState?.error) && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{state?.error || cState?.error}</p>}
      {state?.ok && !state.error && <p className="text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}
