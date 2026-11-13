// Armado de zonas, todos-contra-todos, tablas de posiciones y cuadros de eliminación.
import { matchTotals, type SetScore } from "./scoring";

/* ---------------- Zonas ---------------- */

/**
 * Reparte las parejas en zonas del tamaño pedido. Si no es exacto, algunas zonas
 * quedan con una pareja más (ej. 10 parejas en zonas de 3 => 4, 3, 3).
 * Las parejas cabeza de serie (seed) se reparten primero, una por zona.
 */
export function buildZones<T extends { id: string; seed?: number | null }>(
  pairs: T[],
  zoneSize: number,
  random: () => number = Math.random,
): T[][] {
  const size = Math.max(2, zoneSize);
  const numZones = Math.max(1, Math.floor(pairs.length / size));
  const seeded = pairs.filter((p) => p.seed != null).sort((x, y) => (x.seed! - y.seed!));
  const rest = shuffle(pairs.filter((p) => p.seed == null), random);
  const ordered = [...seeded, ...rest];
  const zones: T[][] = Array.from({ length: numZones }, () => []);
  // Reparto en "serpiente" para equilibrar cabezas de serie.
  ordered.forEach((p, i) => {
    const round = Math.floor(i / numZones);
    const idx = i % numZones;
    zones[round % 2 === 0 ? idx : numZones - 1 - idx].push(p);
  });
  return zones;
}

export function shuffle<T>(arr: T[], random: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Todos contra todos (método del círculo), devuelve los cruces ordenados por fecha. */
export function roundRobin<T>(items: T[]): [T, T][] {
  const list: (T | null)[] = [...items];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const out: [T, T][] = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a != null && b != null) out.push([a, b]);
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

/* ---------------- Tabla de posiciones ---------------- */

export type PlayedMatch = {
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
  sets: SetScore[];
  walkover: boolean;
};

export type StandingRow = {
  pairId: string;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
};

/**
 * Ordena por: partidos ganados, diferencia de sets, diferencia de games,
 * y si quedan 2 empatados, el resultado entre ellos.
 */
export function standings(pairIds: string[], matches: PlayedMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const id of pairIds)
    rows.set(id, { pairId: id, played: 0, won: 0, lost: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0 });

  for (const m of matches) {
    if (!m.winnerId || !m.pairAId || !m.pairBId) continue;
    const A = rows.get(m.pairAId);
    const B = rows.get(m.pairBId);
    if (!A || !B) continue;
    const t = matchTotals(m.sets, m.walkover, m.winnerId === m.pairAId ? "A" : "B");
    A.played++; B.played++;
    if (m.winnerId === m.pairAId) { A.won++; B.lost++; } else { B.won++; A.lost++; }
    A.setsFor += t.setsA; A.setsAgainst += t.setsB; A.gamesFor += t.gamesA; A.gamesAgainst += t.gamesB;
    B.setsFor += t.setsB; B.setsAgainst += t.setsA; B.gamesFor += t.gamesB; B.gamesAgainst += t.gamesA;
  }

  const headToHead = (x: string, y: string) => {
    const m = matches.find(
      (m) => m.winnerId && ((m.pairAId === x && m.pairBId === y) || (m.pairAId === y && m.pairBId === x)),
    );
    if (!m) return 0;
    return m.winnerId === x ? -1 : 1;
  };

  const list = [...rows.values()];
  const key = (r: StandingRow) => [r.won, r.setsFor - r.setsAgainst, r.gamesFor - r.gamesAgainst];
  list.sort((x, y) => {
    const kx = key(x), ky = key(y);
    for (let i = 0; i < kx.length; i++) if (kx[i] !== ky[i]) return ky[i] - kx[i];
    return 0;
  });
  // Desempate por resultado directo entre dos parejas iguales en todo.
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i], b = list[i + 1];
    if (key(a).join() === key(b).join()) {
      const tied = list.filter((r) => key(r).join() === key(a).join());
      if (tied.length === 2 && headToHead(a.pairId, b.pairId) > 0) {
        list[i] = b; list[i + 1] = a;
      }
    }
  }
  return list;
}

/* ---------------- Cuadro de eliminación ---------------- */

export function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/** Orden clásico de cabezas de serie en el cuadro: 1 y 2 solo se cruzan en la final. */
export function seedOrder(size: number): number[] {
  let order = [1, 2];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export type Qualifier = { pairId: string; zone?: string };

/**
 * Arma la primera ronda del cuadro. `qualifiers` viene ordenado por siembra.
 * Devuelve pares [A, B] por posición; null = bye (pase directo).
 * Evita, si puede, que dos parejas de la misma zona se crucen en la primera ronda.
 */
export function firstRound(qualifiers: Qualifier[]): [Qualifier | null, Qualifier | null][] {
  const size = nextPow2(qualifiers.length);
  const order = seedOrder(size);
  const slots = order.map((seed) => qualifiers[seed - 1] ?? null);
  const matches: [Qualifier | null, Qualifier | null][] = [];
  for (let i = 0; i < size; i += 2) matches.push([slots[i], slots[i + 1]]);

  const sameZone = (m: [Qualifier | null, Qualifier | null]) =>
    !!m[0] && !!m[1] && !!m[0].zone && m[0].zone === m[1].zone;
  for (let i = 0; i < matches.length; i++) {
    if (!sameZone(matches[i])) continue;
    for (let j = 0; j < matches.length; j++) {
      if (i === j || !matches[j][1]) continue;
      const a: [Qualifier | null, Qualifier | null] = [matches[i][0], matches[j][1]];
      const b: [Qualifier | null, Qualifier | null] = [matches[j][0], matches[i][1]];
      if (!sameZone(a) && !sameZone(b)) {
        const tmp = matches[i][1];
        matches[i][1] = matches[j][1];
        matches[j][1] = tmp;
        break;
      }
    }
  }
  return matches;
}

/**
 * Orden de siembra de los clasificados de zona: primero todos los 1ros (zona A, B, ...),
 * después los 2dos, etc.
 */
export function seedQualifiers(zones: { name: string; ranked: string[] }[], perZone: number): Qualifier[] {
  const out: Qualifier[] = [];
  for (let pos = 0; pos < perZone; pos++)
    for (const z of zones) if (z.ranked[pos]) out.push({ pairId: z.ranked[pos], zone: z.name });
  return out;
}

export const ROUND_LABEL: Record<number, string> = {
  2: "Final",
  4: "Semifinal",
  8: "Cuartos de final",
  16: "Octavos de final",
  32: "16avos de final",
  64: "32avos de final",
  128: "64avos de final",
};

export function roundLabel(round: number): string {
  return ROUND_LABEL[round] ?? `Ronda de ${round}`;
}

export function zoneName(i: number): string {
  return "Zona " + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : "");
}
