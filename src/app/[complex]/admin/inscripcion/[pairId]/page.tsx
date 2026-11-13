import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { WaButton } from "@/components/WaButton";
import { waLink } from "@/lib/whatsapp";
import { DEFAULT_REJECT, DEFAULT_WELCOME, fillMessage, firstName, suggestSuperior } from "@/lib/messages";
import { decidePair } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Revisión de una inscripción. Se llega desde el link del WhatsApp que manda el jugador
 * (?a=ok para confirmar, ?a=no para cancelar) o desde la pestaña Parejas.
 */
export default async function RevisarInscripcion({
  params, searchParams,
}: { params: Promise<{ complex: string; pairId: string }>; searchParams: Promise<{ a?: string; sup?: string }> }) {
  const { complex: slug, pairId } = await params;
  const sp = await searchParams;
  const complex = await requireAdmin(slug, `/${slug}/admin/inscripcion/${pairId}${sp.a ? `?a=${sp.a}` : ""}`);
  const pair = await db.pair.findUnique({
    where: { id: pairId },
    include: { player1: true, player2: true, category: { include: { tournament: { include: { categories: true } } } } },
  });
  if (!pair || pair.category.tournament.complexId !== complex.id) notFound();
  const cat = pair.category;
  const t = cat.tournament;
  const players = [pair.player1, pair.player2];
  const superior = sp.sup || suggestSuperior(cat.name, t.categories.map((c) => c.name).filter((n) => n !== cat.name));
  const welcome = complex.welcomeMessage || DEFAULT_WELCOME;
  const reject = complex.rejectMessage || DEFAULT_REJECT;
  const h = (<><input type="hidden" name="slug" value={slug} /><input type="hidden" name="pairId" value={pair.id} /></>);

  return (
    <>
      <Header complex={complex} admin />
      <main className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <Link href={`/${slug}/admin/torneo/${t.id}?tab=parejas&cat=${cat.id}`} className="text-sm text-neutral-500">‹ Parejas de {cat.name}</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{t.name}</p>
          <h1 className="h1">Inscripción · {cat.name}</h1>
        </div>

        <div className="card divide-y divide-neutral-100">
          {players.map((p, i) => (
            <div key={p.id} className="p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-neutral-500">Jugador {i + 1}</p>
              <p className="text-base font-semibold">{p.fullName}</p>
              <p className="text-neutral-600">+{p.phone}{p.instagram && <> · {p.instagram}</>}{p.address && <> · {p.address}</>}</p>
            </div>
          ))}
          {pair.availability && <p className="p-3 text-sm"><b>Disponibilidad:</b> {pair.availability}</p>}
          {pair.source === "WEB" && (
            <p className="p-3 text-xs text-neutral-500">
              Aviso por WhatsApp Business: {pair.notifiedAt ? "✅ enviado" : `no enviado${pair.notifyError ? ` (${pair.notifyError})` : ""}`}
            </p>
          )}
        </div>

        {pair.status === "PENDING" && (
          <>
            <form action={decidePair} className={`card space-y-3 p-4 ${sp.a === "no" ? "opacity-60" : "ring-2 ring-emerald-500"}`}>
              {h}
              <input type="hidden" name="decision" value="CONFIRMED" />
              <h2 className="h2">Confirmar</h2>
              <p className="text-sm text-neutral-600">La pareja queda inscripta y les mandás la bienvenida.</p>
              <button className="btn w-full bg-emerald-600 py-3 text-base text-white">✅ Confirmar inscripción</button>
            </form>
            <form action={decidePair} className={`card space-y-3 p-4 ${sp.a === "no" ? "ring-2 ring-red-500" : ""}`}>
              {h}
              <input type="hidden" name="decision" value="REJECTED" />
              <h2 className="h2">Cancelar por categoría</h2>
              <div>
                <label className="label">¿Para qué categoría creés que están?</label>
                <input name="superior" defaultValue={superior} className="input" list="cats-sup" required placeholder="Ej: 4ta Caballeros" />
                <datalist id="cats-sup">{t.categories.filter((c) => c.id !== cat.id).map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <button className="btn w-full bg-red-600 py-3 text-base text-white">❌ Cancelar inscripción</button>
            </form>
          </>
        )}

        {pair.status === "CONFIRMED" && (
          <div className="card space-y-3 p-4">
            <p className="chip bg-emerald-100 text-emerald-800">✅ Inscripción confirmada</p>
            <h2 className="h2">Mandales la bienvenida</h2>
            <p className="rounded-xl bg-neutral-50 p-3 text-sm">{fillMessage(welcome, { nombre: "", categoria: cat.name, torneo: t.name })}</p>
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{p.fullName}</span>
                <WaButton id={`welcome-${pair.id}-${p.id}`} label="Enviar bienvenida"
                  href={waLink(p.phone, fillMessage(welcome, { nombre: firstName(p.fullName), categoria: cat.name, torneo: t.name }))} />
              </div>
            ))}
            <form action={decidePair}>{h}<input type="hidden" name="decision" value="PENDING" /><button className="text-xs text-neutral-500 underline">Volver a pendiente</button></form>
          </div>
        )}

        {pair.status === "REJECTED" && (
          <div className="card space-y-3 p-4">
            <p className="chip bg-red-100 text-red-800">❌ Inscripción cancelada</p>
            <form className="flex items-end gap-2">
              <div className="flex-1"><label className="label">Categoría sugerida</label><input name="sup" defaultValue={superior} className="input" /></div>
              <button className="btn-ghost">Actualizar</button>
            </form>
            <h2 className="h2">Avisales a cada uno</h2>
            {players.map((p) => {
              const msg = fillMessage(reject, { nombre: firstName(p.fullName), categoria: cat.name, superior, torneo: t.name });
              return (
                <div key={p.id} className="space-y-2 rounded-xl bg-neutral-50 p-3">
                  <p className="text-sm">{msg}</p>
                  <div className="flex justify-end"><WaButton id={`reject-${pair.id}-${p.id}-${superior}`} label={`Enviar a ${firstName(p.fullName)}`} href={waLink(p.phone, msg)} /></div>
                </div>
              );
            })}
            <form action={decidePair}>{h}<input type="hidden" name="decision" value="PENDING" /><button className="text-xs text-neutral-500 underline">Volver a pendiente</button></form>
          </div>
        )}
      </main>
    </>
  );
}
