import { db } from "./db";

const MAX_BYTES = 1_500_000;

/**
 * Lee un campo de imagen del formulario (ver components/ImageUpload.tsx).
 * - "<name>_data": imagen nueva en base64 (data URL) → se guarda y devuelve su URL
 * - "<name>_remove" = "1": se quitó la imagen → null
 * - si no, devuelve la URL actual ("<name>"), que también puede escribirse a mano
 * Devuelve undefined si la imagen es inválida.
 */
export async function imageFromForm(fd: FormData, name: string, complexId: string): Promise<string | null | undefined> {
  if (fd.get(`${name}_remove`) === "1") return null;
  const data = String(fd.get(`${name}_data`) ?? "");
  if (data) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(data);
    if (!m) return undefined;
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_BYTES) return undefined;
    const img = await db.image.create({ data: { complexId, mime: m[1], data: buf } });
    return `/api/img/${img.id}`;
  }
  const url = String(fd.get(name) ?? "").trim();
  return url || null;
}
