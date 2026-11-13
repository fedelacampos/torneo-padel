// Operaciones de torneo sobre la base de datos: sorteo, cuadros, resultados y ranking.
import { db } from "./db";
import { buildZones, firstRound, nextPow2, roundRobin, seedQualifiers, standings, zoneName, shuffle, type Qualifier } from "./draw";
import { parseSets, validateMatch, type MatchFormat, type SetScore } from "./scoring";
import { americanoPoints, koCategoryPoints, parsePoints } from "./ranking";

export const FORMAT_LABEL: Record<string, string> = {
  ZONES_KO: "Zonas + fase final",
  KO: "Eliminación directa",
  AMERICANO: "Americano (todos contra todos)",
};

export const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: "Inscripción",
  ZONES: "Fase de zonas",
  PLAYOFFS: "Cuadro en juego",
  FINISHED: "Finalizada",
};

const pairInclude = { player1: true, player2: true } as const;

export async function getCategoryFull(id: string) {
  return db.category.findUnique({
    where: { id },
    include: {
      tournament: { include: { complex: true } },
      pairs: { include: { ...pairInclude, zone: true }, orderBy: { createdAt: "asc" } },
      zones: { orderBy: { name: "asc" }, include: { pairs: { include: pairInclude } } },
      matches: {
        include: { pairA: { include: pairInclude }, pairB: { include: pairInclude } },
        orderBy: [{ stage: "desc" }, { round: "desc" }, { position: "asc" }],
      },
    },
  });
}

export type CategoryFull = NonNullable<Awaited<ReturnType<typeof getCategoryFull>>>;

export function toPlayed(m: { pairAId: string | null; pairBId: string | null; winnerId: string | null; sets: string | null; walkover: boolean }) {
  return { pairAId: m.pairAId, pairBId: m.pairBId, winnerId: m.winnerId, sets: parseSets(m.sets), walkover: m.walkover };
}

export function zoneStandings(cat: CategoryFull) {
  return cat.zones.map((z) => {
    const ms = cat.matches.filter((m) => m.zoneId === z.id);
    return {
      zone: z,
      rows: standings(z.pairs.map((p) => p.id), ms.map(toPlayed)),
      done: ms.length > 0 && ms.every((m) => m.winnerId),
    };
  });
}

export function americanoStandings(cat: CategoryFull) {
  const ms = cat.matches.filter((m) => m.stage === "AMERICANO");
  const ids = cat.pairs.filter((p) => p.status === "CONFIRMED").map((p) => p.id);
  return standings(ids, ms.map(toPlayed));
}

/** Sortea la categoría según su formato. Borra el sorteo anterior. */
export async function generateDraw(categoryId: string): Promise<string | null> {
  const cat = await db.category.findUnique({ where: { id: categoryId }, include: { pairs: true } });
  if (!cat) return "Categoría inexistente.";
  const pairs = cat.pairs.filter((p) => p.status === "CONFIRMED");
  if (pairs.length < 2) return "Se necesitan al menos 2 parejas confirmadas.";

  await db.$transaction([
    db.match.deleteMany({ where: { categoryId } }),
    db.pair.updateMany({ where: { categoryId }, data: { zoneId: null } }),
    db.zone.deleteMany({ where: { categoryId } }),
  ]);

  if (cat.format === "ZONES_KO") {
    if (pairs.length < cat.zoneSize) return `Se necesitan al menos ${cat.zoneSize} parejas para armar zonas.`;
    const zones = buildZones(pairs, cat.zoneSize);
    for (let i = 0; i < zones.length; i++) {
      const zone = await db.zone.create({ data: { categoryId, name: zoneName(i) } });
      await db.pair.updateMany({ where: { id: { in: zones[i].map((p) => p.id) } }, data: { zoneId: zone.id } });
      const games = roundRobin(zones[i]);
      await db.match.createMany({
        data: games.map(([a, b], pos) => ({ categoryId, stage: "ZONE", zoneId: zone.id, position: pos, pairAId: a.id, pairBId: b.id })),
      });
    }
    await db.category.update({ where: { id: categoryId }, data: { status: "ZONES" } });
  } else if (cat.format === "AMERICANO") {
    const games = roundRobin(shuffle(pairs));
    await db.match.createMany({
      data: games.map(([a, b], pos) => ({ categoryId, stage: "AMERICANO", position: pos, pairAId: a.id, pairBId: b.id })),
    });
    await db.category.update({ where: { id: categoryId }, data: { status: "ZONES" } });
  } else {
    const seeded = pairs.filter((p) => p.seed != null).sort((a, b) => a.seed! - b.seed!);
    const rest = shuffle(pairs.filter((p) => p.seed == null));
    await createBracket(categoryId, [...seeded, ...rest].map((p) => ({ pairId: p.id })));
  }
  return null;
}

/** Arma el cuadro de eliminación con los clasificados de las zonas. */
export async function generatePlayoffs(categoryId: string): Promise<string | null> {
  const cat = await getCategoryFull(categoryId);
  if (!cat) return "Categoría inexistente.";
  if (cat.format !== "ZONES_KO") return "Esta categoría no tiene zonas.";
  const zs = zoneStandings(cat);
  if (!zs.every((z) => z.done)) return "Todavía hay partidos de zona sin resultado.";
  const q = seedQualifiers(
    zs.map((z) => ({ name: z.zone.name, ranked: z.rows.map((r) => r.pairId) })),
    cat.qualifiersPerZone,
  );
  if (q.length < 2) return "No hay suficientes clasificados.";
  await db.match.deleteMany({ where: { categoryId, stage: "KO" } });
  await createBracket(categoryId, q);
  return null;
}

async function createBracket(categoryId: string, qualifiers: Qualifier[]) {
  const size = nextPow2(qualifiers.length);
  const first = firstRound(qualifiers);
  const data: { categoryId: string; stage: string; round: number; position: number; pairAId?: string; pairBId?: string }[] = [];
  for (let round = size; round >= 2; round /= 2) {
    for (let pos = 0; pos < round / 2; pos++) {
      const m = round === size ? first[pos] : null;
      data.push({ categoryId, stage: "KO", round, position: pos, pairAId: m?.[0]?.pairId, pairBId: m?.[1]?.pairId });
    }
  }
  await db.match.createMany({ data });
  // Byes: la pareja sin rival pasa directo.
  const byes = await db.match.findMany({ where: { categoryId, stage: "KO", round: size } });
  for (const m of byes) {
    const only = m.pairAId && !m.pairBId ? m.pairAId : !m.pairAId && m.pairBId ? m.pairBId : null;
    if (only) {
      await db.match.update({ where: { id: m.id }, data: { winnerId: only } });
      await placeWinner(categoryId, m.round, m.position, only);
    }
  }
  await db.category.update({ where: { id: categoryId }, data: { status: "PLAYOFFS" } });
}

async function placeWinner(categoryId: string, round: number, position: number, winnerId: string | null) {
  if (round <= 2) return;
  const next = await db.match.findFirst({
    where: { categoryId, stage: "KO", round: round / 2, position: Math.floor(position / 2) },
  });
  if (!next) return;
  await db.match.update({
    where: { id: next.id },
    data: position % 2 === 0 ? { pairAId: winnerId } : { pairBId: winnerId },
  });
}

export async function saveResult(
  matchId: string,
  input: { sets: SetScore[]; walkoverWinner?: "A" | "B" | null },
): Promise<string | null> {
  const m = await db.match.findUnique({ where: { id: matchId }, include: { category: true } });
  if (!m) return "Partido inexistente.";
  if (!m.pairAId || !m.pairBId) return "Todavía no están definidas las dos parejas.";

  let winnerId: string;
  let sets: SetScore[] = [];
  if (input.walkoverWinner) {
    winnerId = input.walkoverWinner === "A" ? m.pairAId : m.pairBId;
  } else {
    const v = validateMatch(input.sets, m.category.matchFormat as MatchFormat);
    if (!v.ok) return v.error;
    winnerId = v.result.winner === "A" ? m.pairAId : m.pairBId;
    sets = input.sets;
  }

  if (m.stage === "KO" && m.winnerId && m.winnerId !== winnerId) {
    const next = await db.match.findFirst({
      where: { categoryId: m.categoryId, stage: "KO", round: m.round / 2, position: Math.floor(m.position / 2) },
    });
    if (next?.winnerId) return "El partido siguiente ya tiene resultado: borralo primero para cambiar el ganador.";
  }

  await db.match.update({
    where: { id: matchId },
    data: { sets: JSON.stringify(sets), walkover: !!input.walkoverWinner, winnerId },
  });

  if (m.stage === "KO") {
    await placeWinner(m.categoryId, m.round, m.position, winnerId);
    if (m.round === 2) await db.category.update({ where: { id: m.categoryId }, data: { status: "FINISHED" } });
  }
  if (m.stage === "AMERICANO") {
    const pending = await db.match.count({ where: { categoryId: m.categoryId, stage: "AMERICANO", winnerId: null } });
    if (pending === 0) await db.category.update({ where: { id: m.categoryId }, data: { status: "FINISHED" } });
  }
  return null;
}

export async function clearResult(matchId: string): Promise<string | null> {
  const m = await db.match.findUnique({ where: { id: matchId } });
  if (!m) return "Partido inexistente.";
  if (m.stage === "KO") {
    const next = await db.match.findFirst({
      where: { categoryId: m.categoryId, stage: "KO", round: m.round / 2, position: Math.floor(m.position / 2) },
    });
    if (next?.winnerId) return "El partido siguiente ya tiene resultado: borralo primero.";
    await placeWinner(m.categoryId, m.round, m.position, null);
  }
  await db.match.update({ where: { id: matchId }, data: { sets: null, walkover: false, winnerId: null } });
  const cat = await db.category.findUnique({ where: { id: m.categoryId } });
  if (cat?.status === "FINISHED")
    await db.category.update({ where: { id: m.categoryId }, data: { status: m.stage === "KO" ? "PLAYOFFS" : "ZONES" } });
  return null;
}

/* ---------------- Ranking ---------------- */

export type RankingRow = {
  playerId: string;
  name: string;
  instagram: string | null;
  points: number;
  tournaments: number;
  detail: { tournament: string; points: number }[];
};

/** Ranking anual: { "5ta Caballeros": [filas ordenadas], ... } */
export async function computeRanking(complexId: string, year: number) {
  const complex = await db.complex.findUnique({ where: { id: complexId } });
  const pts = parsePoints(complex?.rankingPoints);
  const cats = await db.category.findMany({
    where: {
      status: "FINISHED",
      tournament: {
        complexId,
        countsForRanking: true,
        startDate: { gte: new Date(`${year}-01-01T00:00:00-03:00`), lt: new Date(`${year + 1}-01-01T00:00:00-03:00`) },
      },
    },
    include: {
      tournament: true,
      pairs: { where: { status: "CONFIRMED" }, include: { player1: true, player2: true } },
      matches: true,
    },
  });

  const byCategory = new Map<string, Map<string, RankingRow>>();
  for (const c of cats) {
    const key = c.name.trim();
    if (!byCategory.has(key)) byCategory.set(key, new Map());
    const table = byCategory.get(key)!;

    let pairPoints: Map<string, number>;
    if (c.format === "AMERICANO") {
      const st = standings(c.pairs.map((p) => p.id), c.matches.map(toPlayed));
      pairPoints = new Map(st.map((r, i) => [r.pairId, americanoPoints(i + 1, pts)]));
    } else {
      pairPoints = koCategoryPoints(c.pairs.map((p) => p.id), c.matches.filter((m) => m.stage === "KO"), pts);
    }

    for (const p of c.pairs) {
      const got = pairPoints.get(p.id) ?? 0;
      for (const pl of [p.player1, p.player2]) {
        const row = table.get(pl.id) ?? { playerId: pl.id, name: pl.fullName, instagram: pl.instagram, points: 0, tournaments: 0, detail: [] };
        row.points += got;
        row.tournaments++;
        row.detail.push({ tournament: c.tournament.name, points: got });
        table.set(pl.id, row);
      }
    }
  }

  const result: Record<string, RankingRow[]> = {};
  for (const [k, t] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])))
    result[k] = [...t.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  return result;
}
