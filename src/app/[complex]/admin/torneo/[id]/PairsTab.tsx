import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import type { CategoryFull } from "@/lib/tournament";
import { adminAddPair, deletePair, setPairSeed, setPairStatus } from "../../actions";

function Player({ p }: { p: { fullName: string; phone: string; instagram: string | null; address: string | null } }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{p.fullName}</p>
      <p className="text-xs text-neutral-500">
        <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noopener noreferrer" className="underline">+{p.phone}</a>
        {p.instagram && <> · {p.instagram}</>}
        {p.address && <> · {p.address}</>}
      </p>
    </div>
  );
}

export function PairsTab({ slug, cat }: { slug: string; cat: CategoryFull }) {
  const pending = cat.pairs.filter((p) => p.status === "PENDING");
  const confirmed = cat.pairs.filter((p) => p.status === "CONFIRMED");
  const rejected = cat.pairs.filter((p) => p.status === "REJECTED");
  const h = (pairId: string) => (<><input type="hidden" name="slug" value={slug} /><input type="hidden" name="pairId" value={pairId} /></>);
  const locked = cat.status !== "REGISTRATION";

  const card = (p: CategoryFull["pairs"][number], actions: React.ReactNode) => (
    <div key={p.id} className="card space-y-2 p-3">
      <div className="grid gap-2 sm:grid-cols-2"><Player p={p.player1} /><Player p={p.player2} /></div>
      {p.availability && <p className="rounded-lg bg-neutral-50 p-2 text-xs"><b>Disponibilidad:</b> {p.availability}</p>}
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="h2">Por confirmar ({pending.length})</h2>
          {pending.map((p) => card(p, (
            <>
              <Link href={`/${slug}/admin/inscripcion/${p.id}?a=ok`} className="btn px-3 py-1.5 bg-emerald-600 text-white">✅ Confirmar</Link>
              <Link href={`/${slug}/admin/inscripcion/${p.id}?a=no`} className="btn px-3 py-1.5 bg-red-600 text-white">❌ Cancelar</Link>
              <span className="text-xs text-neutral-500">Inscripta por la web</span>
            </>
          )))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="h2">Confirmadas ({confirmed.length})</h2>
        {locked && <p className="text-xs text-neutral-500">La categoría ya fue sorteada: los cambios de parejas se aplican si deshacés el sorteo y volvés a sortear.</p>}
        {confirmed.map((p) => card(p, (
          <>
            <form action={setPairSeed} className="flex items-center gap-1">
              {h(p.id)}
              <label className="text-xs text-neutral-500">Cabeza de serie</label>
              <input name="seed" type="number" min="0" defaultValue={p.seed ?? ""} className="w-14 rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
              <button className="btn-ghost px-2 py-1 text-xs">OK</button>
            </form>
            {p.zone && <span className="chip bg-neutral-100">{p.zone.name}</span>}
            <form action={deletePair} className="ml-auto">{h(p.id)}<button className="text-xs text-red-700 underline">Dar de baja</button></form>
          </>
        )))}
        {confirmed.length === 0 && <p className="text-sm text-neutral-500">Todavía no hay parejas confirmadas.</p>}
      </section>

      <section className="card p-4">
        <h2 className="h2 mb-1">Inscribir pareja</h2>
        <p className="mb-3 text-sm text-neutral-500">Para cuando te pasan los datos por mensaje. Queda confirmada directamente.</p>
        <ActionForm resetOnOk action={adminAddPair} className="space-y-3" submit="Inscribir pareja">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="categoryId" value={cat.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((n) => (
              <fieldset key={n} className="space-y-2">
                <legend className="text-sm font-bold">Jugador {n}</legend>
                <input name={`p${n}_fullName`} className="input" placeholder="Nombre y apellido *" required />
                <input name={`p${n}_phone`} className="input" placeholder="Teléfono *" inputMode="tel" required />
                <input name={`p${n}_address`} className="input" placeholder="Dirección" />
                <input name={`p${n}_instagram`} className="input" placeholder="@instagram" autoCapitalize="none" />
              </fieldset>
            ))}
          </div>
          <textarea name="availability" rows={2} className="input" placeholder="Disponibilidad horaria" />
        </ActionForm>
      </section>

      {rejected.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-neutral-500">Rechazadas / dadas de baja ({rejected.length})</summary>
          <div className="mt-2 space-y-2">
            {rejected.map((p) => card(p, (
              <form action={setPairStatus}>{h(p.id)}<button name="status" value="CONFIRMED" className="btn-ghost px-3 py-1.5">Volver a confirmar</button></form>
            )))}
          </div>
        </details>
      )}
    </div>
  );
}
