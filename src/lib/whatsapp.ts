// Envío de WhatsApp.
// 1) Links wa.me: abren WhatsApp con el mensaje escrito (quien lo abre toca "enviar").
// 2) Automático: WhatsApp Business Cloud API de Meta (WHATSAPP_TOKEN y WHATSAPP_PHONE_ID).
//    Meta exige plantillas aprobadas para los mensajes que inicia la empresa. Ver docs/whatsapp-business.md.

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function whatsappApiEnabled(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

/** Meta no acepta saltos de línea, tabs ni más de 4 espacios seguidos en las variables, ni variables vacías. */
export function cleanParam(s: string | null | undefined): string {
  const t = (s ?? "").replace(/[\r\n\t]+/g, " · ").replace(/ {2,}/g, " ").trim();
  return (t || "-").slice(0, 900);
}

export type TemplateResult = { ok: true } | { ok: false; error: string };

/**
 * Envía una plantilla aprobada.
 * - body: valores de {{1}}, {{2}}... del cuerpo
 * - urlButtons: valor de la parte variable de cada botón de link, en orden
 */
export async function sendTemplate(
  phone: string,
  template: string,
  body: string[],
  urlButtons: string[] = [],
): Promise<TemplateResult> {
  if (!whatsappApiEnabled()) return { ok: false, error: "WhatsApp Business no está configurado" };
  const base = process.env.WHATSAPP_API_URL || `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v23.0"}`;
  const components: unknown[] = [];
  if (body.length) components.push({ type: "body", parameters: body.map((t) => ({ type: "text", text: cleanParam(t) })) });
  urlButtons.forEach((t, i) => components.push({ type: "button", sub_type: "url", index: String(i), parameters: [{ type: "text", text: t }] }));
  try {
    const res = await fetch(`${base}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: { name: template, language: { code: process.env.WHATSAPP_LANG || "es_AR" }, components },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    const j = await res.json().catch(() => null);
    return { ok: false, error: j?.error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de conexión" };
  }
}
