import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { money } from "@/lib/format";
import { waLink } from "@/lib/whatsapp";
import { reportPayment } from "../actions";
import { CopyButton } from "@/components/CopyButton";
import { organizerMessage } from "@/lib/messages";
import { absoluteUrl } from "@/lib/url";

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
  const review = `/${slug}/admin/inscripcion/${pair.id}`;
  const solicitud = organizerMessage({
    tournament: t.name, category: pair.category.name, p1: pair.player1, p2: pair.player2, availability: pair.availability,
    confirmUrl: await absoluteUrl(`${review}?a=ok`), rejectUrl: await absoluteUrl(`${review}?a=no`),
  });
  const notifyText = `Hola! Informo el pago de la inscripción al torneo "${t.name}" (${pair.category.name}) - ${pair.player1.fullName} / ${pair.player2.fullName}.`;

  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <div className="hero rounded-3xl p-6 text-center">
          <div className="relative z-10">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full text-3xl" style={{ background: "var(--brand)", color: "var(--brand-ink)" }}>✓</div>
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none">¡Muchas gracias por tu inscripción!</h1>
            <p className="mt-3 text-white/70">{t.name} · {pair.category.name}</p>
            <p className="mt-1 font-semibold">{pair.player1.fullName} / {pair.player2.fullName}</p>
          </div>
        </div>

        {pair.status === "PENDING" && complex.adminWhatsapp && (
          <div className="card space-y-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Último paso</p>
            <h2 className="font-display text-2xl font-bold uppercase leading-tight">Enviá tu solicitud al organizador</h2>
            <p className="text-sm text-neutral-600">Se abre WhatsApp con tus datos ya escritos: solo tocá enviar. El organizador revisa la categoría y te confirma el lugar por ese mismo chat.</p>
            <a href={waLink(complex.adminWhatsapp, solicitud)} target="_blank" rel="noopener noreferrer" className="btn-wa w-full py-4 text-base">Enviar solicitud por WhatsApp</a>
          </div>
        )}
        {pair.status === "CONFIRMED" && <p className="card p-4 text-center font-semibold text-emerald-700">✅ Tu lugar está confirmado.</p>}
        {pair.status === "REJECTED" && <p className="card p-4 text-center text-neutral-700">El organizador se va a comunicar con ustedes por WhatsApp.</p>}

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
