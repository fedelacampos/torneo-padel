import { db } from "./db";
import { normalizeInstagram, normalizePhone } from "./format";

export type PlayerInput = { fullName: string; address: string; phone: string; instagram: string };

export function readPlayer(fd: FormData, prefix: string): PlayerInput {
  const g = (k: string) => String(fd.get(`${prefix}${k}`) ?? "").trim();
  return { fullName: g("fullName"), address: g("address"), phone: g("phone"), instagram: g("instagram") };
}

export function validatePlayer(p: PlayerInput, label: string, requireAll: boolean): string | null {
  if (p.fullName.split(/\s+/).length < 2) return `${label}: escribí nombre y apellido.`;
  if (normalizePhone(p.phone).length < 10) return `${label}: el teléfono no es válido (con código de área, ej. 11 2345 6789).`;
  if (requireAll && !p.address) return `${label}: falta la dirección.`;
  return null;
}

async function upsertPlayer(complexId: string, p: PlayerInput) {
  const phone = normalizePhone(p.phone);
  const data = {
    fullName: p.fullName,
    address: p.address || undefined,
    instagram: normalizeInstagram(p.instagram) || undefined,
  };
  return db.player.upsert({
    where: { complexId_phone: { complexId, phone } },
    update: data,
    create: { complexId, phone, ...data },
  });
}

/** Crea la pareja inscripta. Los jugadores se identifican por teléfono para el ranking. */
export async function registerPair(opts: {
  complexId: string;
  categoryId: string;
  p1: PlayerInput;
  p2: PlayerInput;
  availability: string;
  source: "WEB" | "ADMIN";
}): Promise<{ error: string } | { pairId: string }> {
  const cat = await db.category.findUnique({ where: { id: opts.categoryId }, include: { tournament: true } });
  if (!cat || cat.tournament.complexId !== opts.complexId) return { error: "Elegí una categoría." };
  if (opts.source === "WEB" && (!cat.tournament.registrationOpen || cat.status !== "REGISTRATION"))
    return { error: "La inscripción para esta categoría está cerrada." };
  if (normalizePhone(opts.p1.phone) === normalizePhone(opts.p2.phone))
    return { error: "Los dos jugadores tienen el mismo teléfono." };

  const [a, b] = [await upsertPlayer(opts.complexId, opts.p1), await upsertPlayer(opts.complexId, opts.p2)];
  const dup = await db.pair.findFirst({
    where: {
      categoryId: cat.id,
      status: { not: "REJECTED" },
      OR: [{ player1Id: { in: [a.id, b.id] } }, { player2Id: { in: [a.id, b.id] } }],
    },
  });
  if (dup) return { error: "Uno de los jugadores ya está inscripto en esta categoría." };

  const pair = await db.pair.create({
    data: {
      categoryId: cat.id,
      player1Id: a.id,
      player2Id: b.id,
      availability: opts.availability || null,
      source: opts.source,
      status: opts.source === "ADMIN" ? "CONFIRMED" : "PENDING",
    },
  });
  return { pairId: pair.id };
}
