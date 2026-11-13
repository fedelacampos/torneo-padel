// Carga un complejo de demostración con torneos, parejas y resultados.
// Uso: npm run db:seed   (admin: /demo/admin  contraseña: demo1234)
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { generateDraw, generatePlayoffs, saveResult } from "../src/lib/tournament";
import type { SetScore } from "../src/lib/scoring";

const NAMES = ["Martín Gómez", "Lucas Fernández", "Juan Pérez", "Nicolás Díaz", "Matías Romero", "Santiago Sosa", "Facundo Álvarez",
  "Tomás Ruiz", "Agustín Torres", "Franco Benítez", "Ignacio Acosta", "Joaquín Medina", "Gonzalo Herrera", "Ezequiel Castro",
  "Pablo Suárez", "Diego Molina", "Federico Ríos", "Leandro Ortiz", "Rodrigo Silva", "Maximiliano Núñez", "Bruno Rojas", "Emiliano Luna"];
const WOMEN = ["Sofía López", "Valentina García", "Camila Martínez", "Lucía Rodríguez", "Martina Sánchez", "Julieta Romero",
  "Florencia Díaz", "Micaela Torres", "Agustina Ruiz", "Carla Ramírez"];

let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

function randomSets(format: "BEST_OF_3" | "SUPER_TB"): SetScore[] {
  const set = (aWins: boolean): SetScore => {
    const opts: [number, number][] = [[6, 2], [6, 3], [6, 4], [7, 5], [6, 1], [7, 6]];
    const [w, l] = opts[Math.floor(rnd() * opts.length)];
    const s: SetScore = aWins ? { a: w, b: l } : { a: l, b: w };
    if (w === 7 && l === 6) { const tl = Math.floor(rnd() * 6); s.tbA = aWins ? 7 : tl; s.tbB = aWins ? tl : 7; }
    return s;
  };
  const first = rnd() > 0.5;
  if (rnd() > 0.45) return [set(first), set(first)];
  const third = rnd() > 0.5;
  const sets = [set(first), set(!first)];
  if (format === "SUPER_TB") {
    const l = Math.floor(rnd() * 9);
    sets.push(third ? { a: 10, b: l, super: true } : { a: l, b: 10, super: true });
  } else sets.push(set(third));
  return sets;
}

async function addPairs(complexId: string, categoryId: string, names: string[], offset: number) {
  for (let i = 0; i + 1 < names.length; i += 2) {
    const mk = (n: string, k: number) => db.player.upsert({
      where: { complexId_phone: { complexId, phone: `54911${String(10000000 + offset + k).slice(-8)}` } },
      update: {},
      create: { complexId, fullName: n, phone: `54911${String(10000000 + offset + k).slice(-8)}`, instagram: "@" + n.split(" ")[0].toLowerCase(), address: "Calle Falsa 123" },
    });
    const a = await mk(names[i], i);
    const b = await mk(names[i + 1], i + 1);
    await db.pair.create({
      data: { categoryId, player1Id: a.id, player2Id: b.id, status: "CONFIRMED", source: "ADMIN", availability: "Viernes después de las 18 hs",
        pay1Status: rnd() > 0.4 ? "PAGADO" : "PENDIENTE", pay1Method: "Efectivo", pay2Status: rnd() > 0.6 ? "INFORMADO" : "PENDIENTE" },
    });
  }
}

async function playAll(categoryId: string, stage: string, upTo = Infinity) {
  let n = 0;
  for (;;) {
    const cat = await db.category.findUniqueOrThrow({ where: { id: categoryId } });
    const m = await db.match.findFirst({
      where: { categoryId, stage, winnerId: null, pairAId: { not: null }, pairBId: { not: null } },
      orderBy: [{ round: "desc" }, { position: "asc" }],
    });
    if (!m || n >= upTo) return;
    const err = await saveResult(m.id, { sets: randomSets(cat.matchFormat as "BEST_OF_3" | "SUPER_TB") });
    if (err) throw new Error(err);
    n++;
  }
}

async function main() {
  await db.complex.deleteMany({ where: { slug: "demo" } });
  const complex = await db.complex.create({
    data: { slug: "demo", name: "Complejo Demo Pádel", adminPassword: hashPassword("demo1234"), adminWhatsapp: "5491100000000",
      mpLink: "https://www.mercadopago.com.ar", mpAlias: "complejo.demo.mp" },
  });
  const day = 864e5;
  const now = Date.now();

  // Torneo pasado y terminado (para el ranking)
  const past = await db.tournament.create({ data: { complexId: complex.id, name: "Torneo Apertura", startDate: new Date(now - 60 * day), endDate: new Date(now - 58 * day), entryFee: 15000, registrationOpen: false } });
  const pastCat = await db.category.create({ data: { tournamentId: past.id, name: "5ta Caballeros", format: "ZONES_KO", matchFormat: "SUPER_TB", zoneSize: 3, qualifiersPerZone: 2 } });
  await addPairs(complex.id, pastCat.id, NAMES.slice(0, 18), 0);
  await generateDraw(pastCat.id);
  await playAll(pastCat.id, "ZONE");
  await generatePlayoffs(pastCat.id);
  await playAll(pastCat.id, "KO");

  // Torneo actual: zonas jugadas en parte
  const cur = await db.tournament.create({ data: { complexId: complex.id, name: "Torneo de Primavera", startDate: new Date(now - 1 * day), endDate: new Date(now + 2 * day), entryFee: 18000 } });
  const c5 = await db.category.create({ data: { tournamentId: cur.id, name: "5ta Caballeros", format: "ZONES_KO", matchFormat: "SUPER_TB", zoneSize: 3, qualifiersPerZone: 2 } });
  await addPairs(complex.id, c5.id, [...NAMES.slice(2, 18), ...NAMES.slice(18, 22)], 2);
  await generateDraw(c5.id);
  await playAll(c5.id, "ZONE", 9);
  const pendingZone = await db.match.findMany({ where: { categoryId: c5.id, winnerId: null }, orderBy: { position: "asc" } });
  let h = 0;
  for (const m of pendingZone) {
    await db.match.update({ where: { id: m.id }, data: { scheduledAt: new Date(Math.ceil(now / 36e5) * 36e5 + h * 36e5 * 0.5), court: String((h % 4) + 1) } });
    h++;
  }

  const d7 = await db.category.create({ data: { tournamentId: cur.id, name: "7ma Damas", format: "AMERICANO", matchFormat: "BEST_OF_3" } });
  await addPairs(complex.id, d7.id, WOMEN, 100);
  await generateDraw(d7.id);
  await playAll(d7.id, "AMERICANO", 6);

  const c4 = await db.category.create({ data: { tournamentId: cur.id, name: "4ta Caballeros", format: "KO", matchFormat: "BEST_OF_3" } });
  await addPairs(complex.id, c4.id, NAMES.slice(0, 12), 200);
  await generateDraw(c4.id);
  await playAll(c4.id, "KO", 4);

  // Torneo próximo con inscripción abierta
  const next = await db.tournament.create({ data: { complexId: complex.id, name: "Torneo Fin de Año", startDate: new Date(now + 20 * day), endDate: new Date(now + 22 * day), entryFee: 20000 } });
  for (const n of ["6ta Caballeros", "5ta Caballeros", "6ta Damas", "Mixto"])
    await db.category.create({ data: { tournamentId: next.id, name: n } });

  console.log("Listo. Público: /demo   Admin: /demo/admin (contraseña demo1234)");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
