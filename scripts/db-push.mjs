// Crea o actualiza las tablas al publicar. Si tarda más de 2 minutos corta con un mensaje claro
// en lugar de quedarse colgado. Con SKIP_DB_PUSH=1 se saltea (tablas creadas a mano en Supabase).
import { spawn } from "node:child_process";

if (process.env.SKIP_DB_PUSH === "1") {
  console.log("SKIP_DB_PUSH=1: no se actualizan las tablas.");
  process.exit(0);
}
const direct = process.env.DIRECT_URL || "";
if (/:6543\//.test(direct) || direct.includes("pgbouncer=true"))
  console.warn("ATENCION: DIRECT_URL usa el puerto 6543. Debe usar el 5432 (sin ?pgbouncer=true).");

const child = spawn("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", shell: true });
const timer = setTimeout(() => {
  console.error("ERROR: la conexion a la base tardo demasiado. Revisa DIRECT_URL (puerto 5432, usuario postgres.<id>, clave).");
  child.kill("SIGKILL");
  process.exit(1);
}, 120000);
child.on("exit", (code) => { clearTimeout(timer); process.exit(code ?? 1); });
