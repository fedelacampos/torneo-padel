"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword, clearSession, hashPassword, requireAdmin, setSession } from "@/lib/auth";
import { parseLocalDateTime } from "@/lib/format";
import { readPlayer, registerPair, validatePlayer } from "@/lib/registration";
import { clearResult, generateDraw, generatePlayoffs, saveResult } from "@/lib/tournament";
import { DEFAULT_POINTS, type RankingPoints } from "@/lib/ranking";
import type { SetScore } from "@/lib/scoring";
import { imageFromForm } from "@/lib/images";

type State = { error?: string; ok?: string } | undefined;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function admin(fd: FormData) {
  return requireAdmin(s(fd, "slug"));
}

/** Verifica que el objeto pertenezca al complejo del administrador. */
async function ownTournament(complexId: string, tournamentId: string) {
  const t = await db.tournament.findUnique({ where: { id: tournamentId } });
  if (!t || t.complexId !== complexId) throw new Error("No autorizado");
  return t;
}
async function ownCategory(complexId: string, categoryId: string) {
  const c = await db.category.findUnique({ where: { id: categoryId }, include: { tournament: true } });
  if (!c || c.tournament.complexId !== complexId) throw new Error("No autorizado");
  return c;
}
async function ownPair(complexId: string, pairId: string) {
  const p = await db.pair.findUnique({ where: { id: pairId }, include: { category: { include: { tournament: true } } } });
  if (!p || p.category.tournament.complexId !== complexId) throw new Error("No autorizado");
  return p;
}
async function ownMatch(complexId: string, matchId: string) {
  const m = await db.match.findUnique({ where: { id: matchId }, include: { category: { include: { tournament: true } } } });
  if (!m || m.category.tournament.complexId !== complexId) throw new Error("No autorizado");
  return m;
}

/* ---------- Sesión ---------- */

export async function login(_: State, fd: FormData): Promise<State> {
  const complex = await db.complex.findUnique({ where: { slug: s(fd, "slug") } });
  if (!complex || !checkPassword(s(fd, "password"), complex.adminPassword)) return { error: "Contraseña incorrecta." };
  await setSession(complex.id);
  // Volver a la página que pidió el login (ej. el link de confirmar una inscripción).
  const next = s(fd, "next");
  redirect(next.startsWith(`/${complex.slug}/admin`) ? next : `/${complex.slug}/admin`);
}

export async function logout(fd: FormData) {
  await clearSession();
  redirect(`/${s(fd, "slug")}`);
}

/* ---------- Ajustes del complejo ---------- */

export async function saveSettings(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const points = {} as RankingPoints;
  for (const k of Object.keys(DEFAULT_POINTS) as (keyof RankingPoints)[]) {
    const v = Number(fd.get(`pts_${k}`));
    points[k] = Number.isFinite(v) && v >= 0 ? Math.round(v) : DEFAULT_POINTS[k];
  }
  const pw = s(fd, "newPassword");
  if (pw && pw.length < 6) return { error: "La contraseña nueva debe tener al menos 6 caracteres." };
  const logoUrl = await imageFromForm(fd, "logoUrl", c.id);
  const coverUrl = await imageFromForm(fd, "coverUrl", c.id);
  if (logoUrl === undefined || coverUrl === undefined) return { error: "No se pudo leer la imagen. Probá con otra foto (JPG o PNG)." };
  await db.complex.update({
    where: { id: c.id },
    data: {
      name: s(fd, "name") || c.name,
      logoUrl,
      coverUrl,
      bookingUrl: s(fd, "bookingUrl") || null,
      location: s(fd, "location") || null,
      welcomeMessage: s(fd, "welcomeMessage") || null,
      rejectMessage: s(fd, "rejectMessage") || null,
      restobarWhatsapp: s(fd, "restobarWhatsapp").replace(/\D/g, "") || null,
      primaryColor: /^#[0-9a-f]{6}$/i.test(s(fd, "primaryColor")) ? s(fd, "primaryColor") : c.primaryColor,
      adminWhatsapp: s(fd, "adminWhatsapp").replace(/\D/g, "") || null,
      mpLink: s(fd, "mpLink") || null,
      mpAlias: s(fd, "mpAlias") || null,
      rankingPoints: JSON.stringify(points),
      ...(pw ? { adminPassword: hashPassword(pw) } : {}),
    },
  });
  revalidatePath(`/${c.slug}`, "layout");
  return { ok: "Cambios guardados." };
}

/* ---------- Torneos y categorías ---------- */

export async function createTournament(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const start = new Date(s(fd, "startDate") + "T00:00:00-03:00");
  const end = new Date(s(fd, "endDate") + "T23:59:00-03:00");
  if (!s(fd, "name")) return { error: "Poné un nombre al torneo." };
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return { error: "Revisá las fechas." };
  const t = await db.tournament.create({
    data: {
      complexId: c.id, name: s(fd, "name"), startDate: start, endDate: end, entryFee: Number(s(fd, "entryFee")) || 0,
      contactPhones: s(fd, "contactPhones") || c.adminWhatsapp || null, notes: s(fd, "notes") || null,
    },
  });
  redirect(`/${c.slug}/admin/torneo/${t.id}`);
}

export async function updateTournament(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const t = await ownTournament(c.id, s(fd, "tournamentId"));
  await db.tournament.update({
    where: { id: t.id },
    data: {
      name: s(fd, "name") || t.name,
      entryFee: Number(s(fd, "entryFee")) || 0,
      registrationOpen: fd.get("registrationOpen") === "on",
      countsForRanking: fd.get("countsForRanking") === "on",
      contactPhones: s(fd, "contactPhones") || null,
      notes: s(fd, "notes") || null,
    },
  });
  revalidatePath(`/${c.slug}/admin/torneo/${t.id}`);
  return { ok: "Torneo actualizado." };
}

export async function deleteTournament(fd: FormData) {
  const c = await admin(fd);
  const t = await ownTournament(c.id, s(fd, "tournamentId"));
  await db.tournament.delete({ where: { id: t.id } });
  redirect(`/${c.slug}/admin`);
}

export async function addCategory(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const t = await ownTournament(c.id, s(fd, "tournamentId"));
  if (!s(fd, "name")) return { error: "Poné el nombre de la categoría (ej. 5ta Caballeros)." };
  await db.category.create({
    data: {
      tournamentId: t.id,
      name: s(fd, "name"),
      eventName: s(fd, "eventName") || null,
      modality: s(fd, "modality") || "Doble",
      format: s(fd, "format") || "ZONES_KO",
      matchFormat: s(fd, "matchFormat") || "BEST_OF_3",
    },
  });
  revalidatePath(`/${c.slug}/admin/torneo/${t.id}`);
  return { ok: "Categoría agregada." };
}

export async function updateCategory(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const cat = await ownCategory(c.id, s(fd, "categoryId"));
  const locked = cat.status !== "REGISTRATION";
  await db.category.update({
    where: { id: cat.id },
    data: {
      name: s(fd, "name") || cat.name,
      eventName: s(fd, "eventName") || null,
      modality: s(fd, "modality") || cat.modality,
      matchFormat: s(fd, "matchFormat") || cat.matchFormat,
      ...(locked ? {} : {
        format: s(fd, "format") || cat.format,
      }),
    },
  });
  revalidatePath(`/${c.slug}/admin/torneo/${cat.tournamentId}`);
  return { ok: "Categoría actualizada." };
}

export async function deleteCategory(fd: FormData) {
  const c = await admin(fd);
  const cat = await ownCategory(c.id, s(fd, "categoryId"));
  await db.category.delete({ where: { id: cat.id } });
  revalidatePath(`/${c.slug}/admin/torneo/${cat.tournamentId}`);
}

export async function drawCategory(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const cat = await ownCategory(c.id, s(fd, "categoryId"));
  const err = await generateDraw(cat.id);
  revalidatePath(`/${c.slug}`, "layout");
  return err ? { error: err } : { ok: "Sorteo realizado." };
}

export async function playoffsCategory(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const cat = await ownCategory(c.id, s(fd, "categoryId"));
  const err = await generatePlayoffs(cat.id);
  revalidatePath(`/${c.slug}`, "layout");
  return err ? { error: err } : { ok: "Cuadro armado." };
}

export async function resetCategory(fd: FormData) {
  const c = await admin(fd);
  const cat = await ownCategory(c.id, s(fd, "categoryId"));
  await db.$transaction([
    db.match.deleteMany({ where: { categoryId: cat.id } }),
    db.pair.updateMany({ where: { categoryId: cat.id }, data: { zoneId: null } }),
    db.zone.deleteMany({ where: { categoryId: cat.id } }),
    db.category.update({ where: { id: cat.id }, data: { status: "REGISTRATION" } }),
  ]);
  revalidatePath(`/${c.slug}`, "layout");
}

/* ---------- Parejas ---------- */

export async function adminAddPair(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const p1 = readPlayer(fd, "p1_");
  const p2 = readPlayer(fd, "p2_");
  const err = validatePlayer(p1, "Jugador 1", false) || validatePlayer(p2, "Jugador 2", false);
  if (err) return { error: err };
  const r = await registerPair({ complexId: c.id, categoryId: s(fd, "categoryId"), p1, p2, availability: s(fd, "availability"), source: "ADMIN" });
  if ("error" in r) return { error: r.error };
  revalidatePath(`/${c.slug}`, "layout");
  return { ok: "Pareja inscripta y confirmada." };
}

export async function setPairStatus(fd: FormData) {
  const c = await admin(fd);
  const p = await ownPair(c.id, s(fd, "pairId"));
  const status = s(fd, "status");
  if (!["PENDING", "CONFIRMED", "REJECTED"].includes(status)) return;
  await db.pair.update({ where: { id: p.id }, data: { status } });
  revalidatePath(`/${c.slug}`, "layout");
}

export async function setPairSeed(fd: FormData) {
  const c = await admin(fd);
  const p = await ownPair(c.id, s(fd, "pairId"));
  const seed = Number(s(fd, "seed"));
  await db.pair.update({ where: { id: p.id }, data: { seed: seed > 0 ? seed : null } });
  revalidatePath(`/${c.slug}`, "layout");
}

export async function deletePair(fd: FormData) {
  const c = await admin(fd);
  const p = await ownPair(c.id, s(fd, "pairId"));
  const used = await db.match.count({ where: { OR: [{ pairAId: p.id }, { pairBId: p.id }] } });
  if (used > 0) {
    await db.pair.update({ where: { id: p.id }, data: { status: "REJECTED" } });
  } else {
    await db.pair.delete({ where: { id: p.id } });
  }
  revalidatePath(`/${c.slug}`, "layout");
}

/** Pagos: el administrador marca el cobro de cada jugador. */
export async function setPayment(fd: FormData) {
  const c = await admin(fd);
  const p = await ownPair(c.id, s(fd, "pairId"));
  const n = s(fd, "player") === "2" ? "2" : "1";
  const method = s(fd, "method"); // Efectivo | Transferencia | Mercado Pago | "" (desmarcar)
  await db.pair.update({
    where: { id: p.id },
    data: n === "1"
      ? { pay1Status: method ? "PAGADO" : "PENDIENTE", pay1Method: method || null }
      : { pay2Status: method ? "PAGADO" : "PENDIENTE", pay2Method: method || null },
  });
  revalidatePath(`/${c.slug}`, "layout");
}

/* ---------- Partidos ---------- */

export async function saveMatchResult(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const m = await ownMatch(c.id, s(fd, "matchId"));
  const wo = s(fd, "walkover");
  let sets: SetScore[] = [];
  try { sets = JSON.parse(s(fd, "sets") || "[]"); } catch { return { error: "Datos inválidos." }; }
  const err = await saveResult(m.id, { sets, walkoverWinner: wo === "A" || wo === "B" ? wo : null });
  revalidatePath(`/${c.slug}`, "layout");
  return err ? { error: err } : { ok: "Resultado guardado." };
}

export async function clearMatchResult(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const m = await ownMatch(c.id, s(fd, "matchId"));
  const err = await clearResult(m.id);
  revalidatePath(`/${c.slug}`, "layout");
  return err ? { error: err } : { ok: "Resultado borrado." };
}

export async function scheduleMatch(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const m = await ownMatch(c.id, s(fd, "matchId"));
  const when = parseLocalDateTime(s(fd, "scheduledAt"));
  await db.match.update({
    where: { id: m.id },
    data: { court: s(fd, "court") || null, scheduledAt: when, remindedAt: when?.getTime() === m.scheduledAt?.getTime() ? m.remindedAt : null },
  });
  revalidatePath(`/${c.slug}`, "layout");
  return { ok: "Horario guardado." };
}

/* ---------- Restobar ---------- */

async function ownProduct(complexId: string, productId: string) {
  const p = await db.product.findUnique({ where: { id: productId } });
  if (!p || p.complexId !== complexId) throw new Error("No autorizado");
  return p;
}

function productData(fd: FormData) {
  return {
    name: s(fd, "name"),
    description: s(fd, "description") || null,
    price: Math.max(0, Math.round(Number(s(fd, "price").replace(/[^\d]/g, "")) || 0)),
    category: s(fd, "category") || "Varios",
    available: fd.get("available") === "on",
  };
}

export async function saveProduct(_: State, fd: FormData): Promise<State> {
  const c = await admin(fd);
  const data = productData(fd);
  if (!data.name) return { error: "Poné el nombre del producto." };
  if (!data.price) return { error: "Poné el precio." };
  const imageUrl = await imageFromForm(fd, "imageUrl", c.id);
  if (imageUrl === undefined) return { error: "No se pudo leer la foto. Probá con otra (JPG o PNG)." };
  const id = s(fd, "productId");
  if (id) {
    await ownProduct(c.id, id);
    await db.product.update({ where: { id }, data: { ...data, imageUrl } });
  } else {
    const last = await db.product.aggregate({ where: { complexId: c.id }, _max: { sortOrder: true } });
    await db.product.create({ data: { ...data, imageUrl, complexId: c.id, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  }
  revalidatePath(`/${c.slug}`, "layout");
  return { ok: id ? "Producto actualizado." : "Producto agregado." };
}

export async function toggleProduct(fd: FormData) {
  const c = await admin(fd);
  const p = await ownProduct(c.id, s(fd, "productId"));
  await db.product.update({ where: { id: p.id }, data: { available: !p.available } });
  revalidatePath(`/${c.slug}`, "layout");
}

export async function deleteProduct(fd: FormData) {
  const c = await admin(fd);
  const p = await ownProduct(c.id, s(fd, "productId"));
  await db.product.delete({ where: { id: p.id } });
  revalidatePath(`/${c.slug}`, "layout");
}

/** Confirmar / cancelar una inscripción desde la pantalla de revisión. */
export async function decidePair(fd: FormData) {
  const c = await admin(fd);
  const p = await ownPair(c.id, s(fd, "pairId"));
  const decision = s(fd, "decision");
  if (!["PENDING", "CONFIRMED", "REJECTED"].includes(decision)) return;
  await db.pair.update({ where: { id: p.id }, data: { status: decision } });
  revalidatePath(`/${c.slug}`, "layout");
  const sup = s(fd, "superior");
  redirect(`/${c.slug}/admin/inscripcion/${p.id}${decision === "REJECTED" && sup ? `?sup=${encodeURIComponent(sup)}` : ""}`);
}
