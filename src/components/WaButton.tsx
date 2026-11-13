"use client";
import { useEffect, useState } from "react";

/** Botón que abre WhatsApp con el mensaje escrito y recuerda (en este dispositivo) que ya se envió. */
export function WaButton({ href, id, label = "Enviar" }: { href: string; id: string; label?: string }) {
  const key = "wa-sent:" + id;
  const [sent, setSent] = useState(false);
  useEffect(() => { try { setSent(localStorage.getItem(key) === "1"); } catch {} }, [key]);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => { setSent(true); try { localStorage.setItem(key, "1"); } catch {} }}
      className={sent ? "btn-ghost px-3 py-1.5 text-xs" : "btn-wa px-3 py-1.5 text-xs"}
    >
      {sent ? "Enviado ✓ (reenviar)" : label}
    </a>
  );
}
