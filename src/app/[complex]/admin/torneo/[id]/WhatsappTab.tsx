import { db } from "@/lib/db";
import { WaButton } from "@/components/WaButton";
import { waLink, whatsappApiEnabled } from "@/lib/whatsapp";
import { dueReminders, publicUrl, reminderMessage, scheduleByPlayer, scheduleMessage } from "@/lib/notifications";
import { fmtDateTime, fmtTime, pairName } from "@/lib/format";

export async function WhatsappTab({ complex, tournamentId }: { complex: { id: string; slug: string; name: string }; tournamentId: string }) {
  const t = await db.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
  const players = await scheduleByPlayer(tournamentId);
  const url = publicUrl(`/${complex.slug}/torneo/${tournamentId}`);
  const soon = (await dueReminders(complex.id, 120)).filter((m) => m.category.tournamentId === tournamentId);
  const auto = whatsappApiEnabled();
  // Versión del mensaje: si cambian los horarios, el botón vuelve a quedar verde.
  const version = (items: string[]) => items.join("|").length.toString(36) + items.length;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="h2">Recordatorios (próximas 2 horas)</h2>
        <p className="mb-2 text-sm text-neutral-500">
          {auto
            ? "El envío automático está activo: cada jugador recibe un recordatorio 1 hora antes de su partido."
            : "Tocá cada botón para mandar el recordatorio. Para que salgan solos 1 hora antes, se configura la API de WhatsApp Business (ver README)."}
        </p>
        {soon.length === 0 && <p className="card p-3 text-sm text-neutral-500">No hay partidos en las próximas 2 horas.</p>}
        <div className="space-y-2">
          {soon.map((m) => (
            <div key={m.id} className="card p-3">
              <p className="text-sm font-semibold">{fmtDateTime(m.scheduledAt!)} {m.court && `· Cancha ${m.court}`} · {m.category.name}</p>
              <div className="mt-2 grid gap-1.5">
                {([[m.pairA!, m.pairB!], [m.pairB!, m.pairA!]] as const).flatMap(([mine, rival]) =>
                  [mine.player1, mine.player2].map((pl) => (
                    <div key={pl.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{pl.fullName}</span>
                      <WaButton id={`rem-${m.id}-${pl.id}-${m.scheduledAt!.getTime()}`} label="Recordar"
                        href={waLink(pl.phone, reminderMessage({ name: pl.fullName, complex: complex.name, time: fmtTime(m.scheduledAt!), court: m.court, rival: pairName(rival) }))} />
                    </div>
                  )),
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="h2">Enviar horarios a cada jugador</h2>
        <p className="mb-2 text-sm text-neutral-500">Se arma el mensaje con todos los partidos que tienen día y hora asignados. Tocá “Enviar” y WhatsApp se abre con el texto listo.</p>
        {players.length === 0 && <p className="card p-3 text-sm text-neutral-500">Asigná día y hora a los partidos (pestaña Partidos) para poder enviarlos.</p>}
        <div className="card divide-y divide-neutral-100">
          {players.map(({ player, items }) => (
            <div key={player.id} className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{player.fullName}</p>
                <p className="whitespace-pre-line text-xs text-neutral-500">{items.join("\n")}</p>
              </div>
              <WaButton id={`sch-${tournamentId}-${player.id}-${version(items)}`}
                href={waLink(player.phone, scheduleMessage({ name: player.fullName, complex: complex.name, tournament: t.name, items, url }))} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
