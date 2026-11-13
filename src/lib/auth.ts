// Sesión simple de administrador por complejo: cookie firmada con HMAC.
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { db } from "./db";

const COOKIE = "admin_session";
const secret = () => process.env.SESSION_SECRET || "dev-secret";

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(pw, salt, 32).toString("hex");
}

export function checkPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("hex");
}

export async function setSession(complexId: string) {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  const v = `${complexId}.${exp}`;
  (await cookies()).set(COOKIE, `${v}.${sign(v)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 3600,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function sessionComplexId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (sign(`${id}.${exp}`) !== sig || Number(exp) < Date.now()) return null;
  return id;
}

/** Devuelve el complejo si el usuario es su administrador; si no, lo manda al login. */
export async function requireAdmin(slug: string, next?: string) {
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) redirect("/");
  const id = await sessionComplexId();
  if (id !== complex.id) redirect(`/${slug}/admin/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return complex;
}
