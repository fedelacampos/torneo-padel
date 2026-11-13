// Envío de WhatsApp.
// 1) Siempre disponible: links wa.me que abren WhatsApp con el mensaje escrito (el organizador toca "enviar").
// 2) Automático (opcional): WhatsApp Business Cloud API de Meta, con WHATSAPP_TOKEN y WHATSAPP_PHONE_ID.
//    Meta exige usar una plantilla aprobada para mensajes iniciados por el negocio.

export function waLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function whatsappApiEnabled(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

/** Envía una plantilla con parámetros de texto. Devuelve true si Meta aceptó el mensaje. */
export async function sendTemplate(phone: string, params: string[]): Promise<boolean> {
  if (!whatsappApiEnabled()) return false;
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "recordatorio_partido",
        language: { code: "es_AR" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });
  return res.ok;
}
