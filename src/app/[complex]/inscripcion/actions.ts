"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readPlayer, registerPair, validatePlayer } from "@/lib/registration";
import { notifyOrganizerNewPair } from "@/lib/notifications";

export async function submitRegistration(_: { error?: string; ok?: string } | undefined, fd: FormData): Promise<{ error?: string; ok?: string } | undefined> {
  const slug = String(fd.get("slug"));
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) return { error: "Complejo inexistente." };
  const p1 = readPlayer(fd, "p1_");
  const p2 = readPlayer(fd, "p2_");
  const err = validatePlayer(p1, "Jugador 1", true) || validatePlayer(p2, "Jugador 2", true);
  if (err) return { error: err };
  if (fd.get("weekend") !== "on") return { error: "Confirmá que pueden jugar sábado y domingo (instancias finales)." };
  const r = await registerPair({
    complexId: complex.id,
    categoryId: String(fd.get("categoryId") ?? ""),
    p1, p2,
    availability: String(fd.get("availability") ?? "").trim(),
    source: "WEB",
  });
  if ("error" in r) return { error: r.error };
  // El WhatsApp Business del complejo le avisa al organizador (si falla, la inscripción igual queda hecha).
  await notifyOrganizerNewPair(r.pairId).catch(() => {});
  redirect(`/${slug}/inscripcion/${r.pairId}`);
}

export async function reportPayment(fd: FormData) {
  const pairId = String(fd.get("pairId"));
  const who = String(fd.get("who"));
  const pair = await db.pair.findUnique({ where: { id: pairId }, include: { category: { include: { tournament: { include: { complex: true } } } } } });
  if (!pair) return;
  const data: Record<string, string> = {};
  if ((who === "1" || who === "both") && pair.pay1Status === "PENDIENTE") { data.pay1Status = "INFORMADO"; data.pay1Method = "Mercado Pago"; }
  if ((who === "2" || who === "both") && pair.pay2Status === "PENDIENTE") { data.pay2Status = "INFORMADO"; data.pay2Method = "Mercado Pago"; }
  await db.pair.update({ where: { id: pairId }, data });
  redirect(`/${pair.category.tournament.complex.slug}/inscripcion/${pairId}?informado=${who}`);
}
