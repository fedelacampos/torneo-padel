// Ranking anual por categoría: cada jugador suma puntos según la instancia a la que llegó.

export type RankingPoints = {
  zone: number; // perdió en zona
  r64: number; // 32avos de final
  r32: number; // 16avos de final
  r16: number; // octavos de final
  r8: number; // cuartos de final
  r4: number; // semifinal
  r2: number; // finalista
  champion: number; // campeón
};

export const DEFAULT_POINTS: RankingPoints = {
  zone: 25,
  r64: 25,
  r32: 37,
  r16: 50,
  r8: 75,
  r4: 100,
  r2: 150,
  champion: 200,
};

export const POINTS_LABEL: Record<keyof RankingPoints, string> = {
  zone: "Perdedor de zona",
  r64: "32avos de final",
  r32: "16avos de final",
  r16: "Octavos de final",
  r8: "Cuartos de final",
  r4: "Semifinal",
  r2: "Finalista",
  champion: "Campeón",
};

export function parsePoints(json: string | null | undefined): RankingPoints {
  if (!json) return DEFAULT_POINTS;
  try {
    return { ...DEFAULT_POINTS, ...JSON.parse(json) };
  } catch {
    return DEFAULT_POINTS;
  }
}

/** Puntos por quedar eliminado en una ronda del cuadro (round = parejas en esa ronda). */
export function pointsForRound(round: number, pts: RankingPoints): number {
  switch (round) {
    case 2: return pts.r2;
    case 4: return pts.r4;
    case 8: return pts.r8;
    case 16: return pts.r16;
    case 32: return pts.r32;
    default: return pts.r64;
  }
}

type KoMatch = {
  round: number;
  pairAId: string | null;
  pairBId: string | null;
  winnerId: string | null;
};

/**
 * Calcula los puntos de cada pareja en una categoría terminada con cuadro.
 * `zonePairIds` son las parejas que jugaron zona (las que no pasaron reciben `zone`).
 */
export function koCategoryPoints(
  allPairIds: string[],
  koMatches: KoMatch[],
  pts: RankingPoints,
): Map<string, number> {
  const out = new Map<string, number>();
  const final = koMatches.find((m) => m.round === 2);
  for (const id of allPairIds) {
    const mine = koMatches.filter((m) => m.pairAId === id || m.pairBId === id);
    if (mine.length === 0) {
      out.set(id, pts.zone);
      continue;
    }
    if (final?.winnerId === id) {
      out.set(id, pts.champion);
      continue;
    }
    const lowest = Math.min(...mine.map((m) => m.round));
    out.set(id, pointsForRound(lowest, pts));
  }
  return out;
}

/** Americano (todos contra todos): puntos según la posición final en la tabla. */
export function americanoPoints(position: number, pts: RankingPoints): number {
  if (position === 1) return pts.champion;
  if (position === 2) return pts.r2;
  if (position <= 4) return pts.r4;
  if (position <= 8) return pts.r8;
  if (position <= 16) return pts.r16;
  return pts.zone;
}
