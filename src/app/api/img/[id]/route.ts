// Sirve las imágenes subidas desde el panel (logo, portada, productos).
import { db } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await db.image.findUnique({ where: { id } });
  if (!img) return new Response("No encontrada", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
