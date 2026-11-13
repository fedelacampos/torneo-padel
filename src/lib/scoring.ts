// Reglas de puntuación de partidos de pádel.
//
// Formatos:
//  - BEST_OF_3: al mejor de 3 sets. En 6-6 se juega tiebreak (set 7-6).
//  - SUPER_TB:  igual, pero si quedan 1-1 en sets, el 3ro es un supertiebreak
//               a 10 puntos con diferencia de 2 (10-8, 11-9, 12-10...).

export type MatchFormat = "BEST_OF_3" | "SUPER_TB";

export type SetScore = {
  a: number;
  b: number;
  tbA?: number; // puntos del tiebreak (solo si el set terminó 7-6)
  tbB?: number;
  super?: boolean; // true si este set es un supertiebreak
};

export const MATCH_FORMAT_LABEL: Record<MatchFormat, string> = {
  BEST_OF_3: "Mejor de 3 sets (tiebreak en 6-6)",
  SUPER_TB: "2 sets + supertiebreak a 10",
};

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/** Un tiebreak/supertiebreak se gana llegando a `target` con 2 de diferencia. */
function validTiebreak(w: number, l: number, target: number): boolean {
  if (w < target) return false;
  if (w === target) return l <= target - 2;
  return w - l === 2;
}

/** Devuelve un mensaje de error o null si el set es válido. */
export function validateSet(s: SetScore, n: number): string | null {
  const label = `Set ${n}`;
  if (!isInt(s.a) || !isInt(s.b)) return `${label}: completá los games.`;
  if (s.a === s.b) return `${label}: no puede terminar empatado.`;
  const w = Math.max(s.a, s.b);
  const l = Math.min(s.a, s.b);

  if (s.super) {
    if (!validTiebreak(w, l, 10))
      return `${label}: el supertiebreak se gana llegando a 10 con 2 de diferencia (ej. 10-8, 11-9).`;
    return null;
  }

  if (w === 6 && l <= 4) return null;
  if (w === 7 && l === 5) return null;
  if (w === 7 && l === 6) {
    if (!isInt(s.tbA) || !isInt(s.tbB)) return `${label}: cargá el resultado del tiebreak.`;
    const aWonSet = s.a > s.b;
    const tw = aWonSet ? s.tbA : s.tbB;
    const tl = aWonSet ? s.tbB : s.tbA;
    if (!validTiebreak(tw, tl, 7))
      return `${label}: el tiebreak lo gana quien llega a 7 con 2 de diferencia, y debe ser quien ganó el set.`;
    return null;
  }
  return `${label}: resultado inválido (válidos: 6-0 a 6-4, 7-5 o 7-6 con tiebreak).`;
}

export type MatchResult = { winner: "A" | "B"; setsA: number; setsB: number };

/** Valida el partido completo. Devuelve el ganador o un error. */
export function validateMatch(
  sets: SetScore[],
  format: MatchFormat,
): { ok: true; result: MatchResult } | { ok: false; error: string } {
  if (sets.length < 2) return { ok: false, error: "Un partido tiene al menos 2 sets." };
  if (sets.length > 3) return { ok: false, error: "Un partido tiene como máximo 3 sets." };

  let sa = 0;
  let sb = 0;
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    if (sa === 2 || sb === 2) return { ok: false, error: "Se cargaron sets después de que el partido terminó." };
    const isThird = i === 2;
    if (s.super && !(isThird && format === "SUPER_TB"))
      return { ok: false, error: "El supertiebreak solo puede ser el 3er set en el formato con supertiebreak." };
    if (isThird && format === "SUPER_TB" && !s.super)
      return { ok: false, error: "En este formato el 3er set es un supertiebreak a 10." };
    const err = validateSet(s, i + 1);
    if (err) return { ok: false, error: err };
    if (s.a > s.b) sa++;
    else sb++;
  }
  if (sa < 2 && sb < 2) return { ok: false, error: "El partido no está terminado: falta el 3er set." };
  return { ok: true, result: { winner: sa > sb ? "A" : "B", setsA: sa, setsB: sb } };
}

/** Texto corto del resultado, ej: "6-4 6-7(5) [10-8]". */
export function formatScore(sets: SetScore[] | null | undefined, walkover = false): string {
  if (walkover) return "W.O.";
  if (!sets || sets.length === 0) return "";
  return sets
    .map((s) => {
      if (s.super) return `[${s.a}-${s.b}]`;
      if (s.tbA != null && s.tbB != null && Math.abs(s.a - s.b) === 1 && Math.max(s.a, s.b) === 7)
        return `${s.a}-${s.b}(${Math.min(s.tbA, s.tbB)})`;
      return `${s.a}-${s.b}`;
    })
    .join(" ");
}

export function parseSets(json: string | null | undefined): SetScore[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Sets y games ganados por cada lado (un supertiebreak cuenta como 1 game). */
export function matchTotals(sets: SetScore[], walkover: boolean, winner: "A" | "B") {
  if (walkover) {
    return winner === "A"
      ? { setsA: 2, setsB: 0, gamesA: 12, gamesB: 0 }
      : { setsA: 0, setsB: 2, gamesA: 0, gamesB: 12 };
  }
  let setsA = 0, setsB = 0, gamesA = 0, gamesB = 0;
  for (const s of sets) {
    if (s.a > s.b) setsA++;
    else setsB++;
    if (s.super) {
      if (s.a > s.b) gamesA++;
      else gamesB++;
    } else {
      gamesA += s.a;
      gamesB += s.b;
    }
  }
  return { setsA, setsB, gamesA, gamesB };
}
