// Links cortos de los botones del WhatsApp al organizador:
//   /r/ok/<pareja>  → confirmar     /r/no/<pareja>  → cancelar
// Llevan a la pantalla de revisión de la inscripción en el panel.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ accion: string; pairId: string }> }) {
  const { accion, pairId } = await params;
  const pair = await db.pair.findUnique({
    where: { id: pairId },
    select: { category: { select: { tournament: { select: { complex: { select: { slug: true } } } } } } },
  });
  if (!pair) return NextResponse.redirect(new URL("/", req.url));
  const slug = pair.category.tournament.complex.slug;
  return NextResponse.redirect(new URL(`/${slug}/admin/inscripcion/${pairId}?a=${accion === "no" ? "no" : "ok"}`, req.url));
}
