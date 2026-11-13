// Mensajes de WhatsApp del circuito de inscripción. Los textos son editables en Ajustes del complejo.

export const DEFAULT_WELCOME = "¡BIENVENIDOS AL CIRCUITO OFICIAL 2027 - EL 92!";

export const DEFAULT_REJECT =
  "¡Hola [Nombre]! ¿Cómo estás? Vimos tu solicitud para anotarte en [Categoría]. " +
  "Te escribimos porque tenemos entendido que venís jugando muy bien, creemos que estás para [Categoría superior]. " +
  "¡Nos encantaría que participes en [Categoría superior], que seguro va a estar muy buena! Avisanos si te sumás ahí. ¡Abrazo!";

export const PLACEHOLDERS = "[Nombre], [Categoría], [Categoría superior], [Torneo]";

/** Reemplaza [Nombre], [Categoría], etc. (sin importar mayúsculas ni tildes en la etiqueta). */
export function fillMessage(template: string, vars: { nombre: string; categoria: string; superior?: string; torneo?: string }): string {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const map: Record<string, string> = {
    nombre: vars.nombre,
    categoria: vars.categoria,
    "categoria superior": vars.superior ?? "",
    "nombre de la categoria": vars.categoria,
    torneo: vars.torneo ?? "",
    "nombre del torneo": vars.torneo ?? "",
  };
  return template.replace(/\[([^\]]+)\]/g, (m, key) => map[norm(key)] ?? m);
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/**
 * Sugerencia de categoría superior: en pádel un número más bajo es un nivel más alto
 * (5ta → 4ta). Busca entre las categorías del torneo la del número anterior con el mismo
 * género; si no existe, propone el texto igual.
 */
export function suggestSuperior(name: string, others: string[]): string {
  const m = /^(\d+)\s*(?:ra|da|ta|ma|va|na|era|°|º)?\s*(.*)$/i.exec(name.trim());
  if (!m) return "";
  const n = Number(m[1]);
  if (n <= 1) return "";
  const rest = m[2].trim().toLowerCase();
  const found = others.find((o) => {
    const x = /^(\d+)\s*\D{0,3}\s*(.*)$/i.exec(o.trim());
    return x && Number(x[1]) === n - 1 && x[2].trim().toLowerCase() === rest;
  });
  if (found) return found;
  const suf: Record<number, string> = { 1: "ra", 2: "da", 3: "ra", 4: "ta", 5: "ta", 6: "ta", 7: "ma", 8: "va", 9: "na" };
  return `${n - 1}${suf[n - 1] ?? "°"}${m[2] ? " " + m[2].trim() : ""}`;
}

/** Mensaje que el jugador le manda al organizador al inscribirse, con los links para confirmar o cancelar. */
export function organizerMessage(o: {
  tournament: string; category: string;
  p1: { fullName: string; phone: string; instagram: string | null };
  p2: { fullName: string; phone: string; instagram: string | null };
  availability: string | null; confirmUrl: string; rejectUrl: string;
}) {
  const pl = (n: number, p: typeof o.p1) => `Jugador ${n}: ${p.fullName} · +${p.phone}${p.instagram ? ` · ${p.instagram}` : ""}`;
  return [
    `🎾 *Nueva inscripción*`,
    `${o.tournament} · *${o.category}*`,
    "",
    pl(1, o.p1),
    pl(2, o.p2),
    ...(o.availability ? ["", `Disponibilidad: ${o.availability}`] : []),
    "",
    `✅ CONFIRMAR inscripción:`,
    o.confirmUrl,
    "",
    `❌ CANCELAR inscripción:`,
    o.rejectUrl,
  ].join("\n");
}
