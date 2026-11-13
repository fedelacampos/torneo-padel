// Se ejecuta en cada publicación: crea el complejo inicial si todavía no existe.
// Variables: COMPLEX_SLUG, COMPLEX_NAME, ADMIN_PASSWORD (y opcionalmente SEED_DEMO=1 para cargar la demo).
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const slug = (process.env.COMPLEX_SLUG || "").trim().toLowerCase();
  const name = (process.env.COMPLEX_NAME || "").trim();
  const pw = process.env.ADMIN_PASSWORD || "";
  if (slug && name && pw) {
    const exists = await db.complex.findUnique({ where: { slug } });
    if (!exists) {
      await db.complex.create({ data: { slug, name, adminPassword: hashPassword(pw) } });
      console.log(`Complejo creado: /${slug}`);
    }
  } else {
    console.log("COMPLEX_SLUG / COMPLEX_NAME / ADMIN_PASSWORD no configurados: no se crea complejo.");
  }
  if (process.env.SEED_DEMO === "1" && !(await db.complex.findUnique({ where: { slug: "demo" } }))) {
    const { seedDemo } = await import("./seed");
    await seedDemo();
  }
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
