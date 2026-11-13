// Ejecuta el envío de recordatorios una vez (útil con un cron del servidor).
import { sendDueReminders } from "../src/lib/notifications";
sendDueReminders().then((r) => { console.log(r); process.exit(0); });
