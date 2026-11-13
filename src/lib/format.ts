export function normalizePhone(p: string): string {
  let d = p.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  // Argentina: si cargan "11 2345 6789" o "011..." agregamos 549
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "549" + d;
  if (d.startsWith("54") && !d.startsWith("549") && d.length === 12) d = "549" + d.slice(2);
  return d;
}

export function normalizeInstagram(s: string): string {
  const t = s.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
  return t ? (t.startsWith("@") ? t : "@" + t) : "";
}

const TZ = "America/Argentina/Buenos_Aires";

export function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

/** Convierte "2026-11-14T10:30" (hora Argentina) a Date. */
export function parseLocalDateTime(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + ":00-03:00");
  return isNaN(d.getTime()) ? null : d;
}

/** Date -> "2026-11-14T10:30" en hora Argentina (para inputs datetime-local). */
export function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const t = new Date(new Date(d).getTime() - 3 * 3600 * 1000);
  return t.toISOString().slice(0, 16);
}

export function money(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export function pairName(p: { player1: { fullName: string }; player2: { fullName: string } } | null | undefined): string {
  if (!p) return "A definir";
  return `${shortName(p.player1.fullName)} / ${shortName(p.player2.fullName)}`;
}

export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
