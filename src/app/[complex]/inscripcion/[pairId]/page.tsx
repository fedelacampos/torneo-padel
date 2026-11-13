import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { reportPayment } from "../actions";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

const PAY_LABEL: Record<string, [string, string]> = {
  PENDIENTE: ["Pendiente", "bg-neutral-100 text-neutral-700"],
  INFORMADO: ["Informado, a confirmar", "bg-amber-100 text-amber-800"],
  PAGADO: ["Pagado", "bg-emerald-100 text-emerald-800"],
};

export default async function InscripcionOk({
  params, searchParams,
}: { params: Promise<{ complex: string; pairId: string }>; searchParams: Promise<{ informado?: string }> }) {
  const { complex: slug, pairId } = await params;
  const { informado } = await searchParams;
  const pair = await db.pair.findUnique({
    where: { id: pairId },
    include: { player1: true, player2: true, category: { include: { tournament: { include: { complex: true } } } } },
  });
  if (!pair || pair.category.tournament.complex.slug !== slug) notFound();
  const t = pair.category.tournament;
  const complex = t.complex;
  const players = [
    { n: "1", p: pair.player1, status: pair.pay1Status },
    { n: "2", p: pair.player2, status: pair.pay2Status },
  ];
  const anyPending = players.some((x) => x.status === "PENDIENTE");
  const notifyText = `Hola! Informo el pago de la inscripción al torneo "${t.name}" (${pair.category.name}) - ${pair.player1.fullName} / ${pair.player2.fullName}.`;

  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <div className="card p-5 text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="h1">¡Inscripción recibida!</h1>
          <p className="mt-1 text-neutral-600">{t.name} · {pair.category.name}</p>
          <p className="mt-2 font-semibold">{pair.player1.fullName} / {pair.player2.fullName}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {pair.status === "CONFIRMED" ? "Su lugar está confirmado." : "El organizador va a confirmar su lugar."} Guardá esta página para ver el estado del pago.
          </p>
        </div>

        {t.entryFee > 0 && (
          <div className="card space-y-4 p-5">
            <h2 className="h2">Pago de la inscripción</h2>
            <p className="text-sm">Valor: <b>{money(t.entryFee)}</b> por jugador ({money(t.entryFee * 2)} la pareja).</p>
            <ul className="space-y-1.5">
              {players.map(({ n, p, status }) => (
                <li key={n} className="flex items-center justify-between text-sm">
                  <span>{p.fullName}</span>
                  <span className={`chip ${PAY_LABEL[status][1]}`}>{PAY_LABEL[status][0]}</span>
                </li>
              ))}
            </ul>

            {anyPending && (
              <>
                {complex.mpLink && (
                  <a href={complex.mpLink} target="_blank" rel="noopener noreferrer" className="btn-mp w-full py-3.5 text-base">Pagar con Mercado Pago</a>
                )}
                {complex.mpAlias && (
                  <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-3 text-sm">
                    <span>Alias: <b>{complex.mpAlias}</b></span>
                    <CopyButton text={complex.mpAlias} />
                  </div>
                )}
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-semibold">¿Ya pagaste? Avisale al organizador:</p>
                  <form action={reportPayment} className="grid gap-2">
                    <input type="hidden" name="pairId" value={pair.id} />
                    {players.filter((x) => x.status === "PENDIENTE").length === 2 && (
                      <button name="who" value="both" className="btn-primary">Pagué los dos jugadores</button>
                    )}
                    {players.filter((x) => x.status === "PENDIENTE").map(({ n, p }) => (
                      <button key={n} name="who" value={n} className="btn-ghost">Pagó {p.fullName}</button>
                    ))}
                  </form>
                </div>
              </>
            )}

            {informado && complex.adminWhatsapp && (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm">
                <p className="mb-2">Listo, el pago quedó informado. Si querés, mandale el comprobante al organizador:</p>
                <a className="btn-wa w-full" href={waLink(complex.adminWhatsapp, notifyText)} target="_blank" rel="noopener noreferrer">Enviar comprobante por WhatsApp</a>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
