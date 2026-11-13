// Armado de mensajes de WhatsApp para horarios y recordatorios.
import { db } from "./db";
import { fmtDateTime, fmtTime, pairName } from "./format";
import { roundLabel } from "./draw";
import { sendTemplate, whatsappApiEnabled } from "./whatsapp";

const pairInc = { include: { player1: true, player2: true } } as const;

export function publicUrl(path: string) {
  return (process.env.PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "") + path;
}

/** Partidos programados del torneo, agrupados por jugador. */
export async function scheduleByPlayer(tournamentId: string) {
  const matches = await db.match.findMany({
    where: { category: { tournamentId }, scheduledAt: { not: null }, winnerId: null, pairAId: { not: null }, pairBId: { not: null } },
    include: { category: true, pairA: pairInc, pairB: pairInc },
    orderBy: { scheduledAt: "asc" },
  });
  const map = new Map<string, { player: { id: string; fullName: string; phone: string }; items: string[] }>();
  for (const m of matches) {
    for (const [mine, rival] of [[m.pairA!, m.pairB!], [m.pairB!, m.pairA!]] as const) {
      const stage = m.stage === "KO" ? roundLabel(m.round) : m.category.name;
      const line = `• ${fmtDateTime(m.scheduledAt!)}${m.court ? ` - Cancha ${m.court}` : ""} - ${stage} vs ${pairName(rival)}`;
      for (const pl of [mine.player1, mine.player2]) {
        const e = map.get(pl.id) ?? { player: pl, items: [] };
        e.items.push(line);
        map.set(pl.id, e);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.player.fullName.localeCompare(b.player.fullName));
}

export function scheduleMessage(o: { name: string; complex: string; tournament: string; items: string[]; url: string }) {
  return `¡Hola ${o.name.split(" ")[0]}! Te escribimos de ${o.complex} 🎾\nTus partidos en "${o.tournament}":\n${o.items.join("\n")}\n\nFixture y resultados en vivo: ${o.url}\n¡Te esperamos 15 minutos antes!`;
}

export function reminderMessage(o: { name: string; complex: string; time: string; court: string | null; rival: string }) {
  return `¡Hola ${o.name.split(" ")[0]}! Te recordamos que hoy a las ${o.time}${o.court ? ` en la cancha ${o.court}` : ""} jugás contra ${o.rival}. ¡Éxitos! - ${o.complex}`;
}

/** Partidos que empiezan en la próxima hora y todavía no tienen recordatorio. */
export async function dueReminders(complexId?: string, withinMinutes = 60) {
  const now = new Date();
  const until = new Date(now.getTime() + withinMinutes * 60000);
  return db.match.findMany({
    where: {
      scheduledAt: { gt: now, lte: until },
      remindedAt: null,
      winnerId: null,
      pairAId: { not: null },
      pairBId: { not: null },
      ...(complexId ? { category: { tournament: { complexId } } } : {}),
    },
    include: { category: { include: { tournament: { include: { complex: true } } } }, pairA: pairInc, pairB: pairInc },
    orderBy: { scheduledAt: "asc" },
  });
}

/** Envío automático por la API de WhatsApp (si está configurada). Devuelve cuántos mensajes salieron. */
export async function sendDueReminders() {
  if (!whatsappApiEnabled()) return { sent: 0, matches: 0, enabled: false };
  const due = await dueReminders();
  let sent = 0;
  for (const m of due) {
    const complex = m.category.tournament.complex.name;
    for (const [mine, rival] of [[m.pairA!, m.pairB!], [m.pairB!, m.pairA!]] as const) {
      for (const pl of [mine.player1, mine.player2]) {
        // Parámetros de la plantilla: {{1}} nombre, {{2}} hora, {{3}} cancha, {{4}} rival, {{5}} complejo
        const r = await sendTemplate(pl.phone, process.env.WHATSAPP_TEMPLATE || "recordatorio_partido",
          [pl.fullName.split(" ")[0], fmtTime(m.scheduledAt!), m.court ?? "-", pairName(rival), complex]);
        if (r.ok) sent++;
      }
    }
    await db.match.update({ where: { id: m.id }, data: { remindedAt: new Date() } });
  }
  return { sent, matches: due.length, enabled: true };
}

/**
 * Avisa al organizador que hay una inscripción nueva, desde el WhatsApp Business del complejo.
 * Plantilla (ver docs/whatsapp-business.md): cuerpo con 5 variables y dos botones de link
 * (Confirmar / Cancelar) cuya parte variable es el id de la pareja.
 */
export async function notifyOrganizerNewPair(pairId: string) {
  const pair = await db.pair.findUnique({
    where: { id: pairId },
    include: { player1: true, player2: true, category: { include: { tournament: { include: { complex: true } } } } },
  });
  if (!pair) return;
  const complex = pair.category.tournament.complex;
  if (!complex.adminWhatsapp) {
    await db.pair.update({ where: { id: pairId }, data: { notifyError: "Falta el WhatsApp del organizador en Ajustes" } });
    return;
  }
  const pl = (p: { fullName: string; phone: string; instagram: string | null }) =>
    `${p.fullName} · +${p.phone}${p.instagram ? ` · ${p.instagram}` : ""}`;
  const r = await sendTemplate(
    complex.adminWhatsapp,
    process.env.WHATSAPP_TEMPLATE_INSCRIPCION || "nueva_inscripcion",
    [pair.category.tournament.name, pair.category.name, pl(pair.player1), pl(pair.player2), pair.availability || "Sin aclarar"],
    [pair.id, pair.id],
  );
  await db.pair.update({
    where: { id: pairId },
    data: r.ok ? { notifiedAt: new Date(), notifyError: null } : { notifyError: r.error },
  });
}
