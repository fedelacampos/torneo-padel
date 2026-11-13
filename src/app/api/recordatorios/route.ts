// Endpoint para enviar los recordatorios automáticos (1 hora antes de cada partido).
// Llamarlo cada 5-10 minutos desde un cron (ej. Vercel Cron) con el header
// Authorization: Bearer <CRON_SECRET>.
import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(await sendDueReminders());
}
