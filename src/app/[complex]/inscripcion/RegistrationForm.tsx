"use client";
import { useFormAction } from "@/components/useFormAction";
import { submitRegistration } from "./actions";

type Cat = { id: string; name: string; tournament: string };

function PlayerFields({ n }: { n: 1 | 2 }) {
  const p = `p${n}_`;
  return (
    <fieldset className="card space-y-3 p-4">
      <legend className="px-1 text-sm font-bold">Jugador {n}</legend>
      <div><label className="label">Nombre y apellido *</label><input name={p + "fullName"} className="input" required autoComplete={n === 1 ? "name" : "off"} /></div>
      <div><label className="label">Teléfono (WhatsApp) *</label><input name={p + "phone"} className="input" required inputMode="tel" placeholder="11 2345 6789" autoComplete={n === 1 ? "tel" : "off"} /></div>
      <div><label className="label">Dirección *</label><input name={p + "address"} className="input" required autoComplete={n === 1 ? "street-address" : "off"} /></div>
      <div><label className="label">Instagram</label><input name={p + "instagram"} className="input" placeholder="@usuario" autoCapitalize="none" /></div>
    </fieldset>
  );
}

export function RegistrationForm({ slug, categories }: { slug: string; categories: Cat[] }) {
  const { state, pending, ref, onSubmit } = useFormAction(submitRegistration);
  const tournaments = [...new Set(categories.map((c) => c.tournament))];
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="card p-4">
        <label className="label">Torneo y categoría *</label>
        <select name="categoryId" className="input" required defaultValue="">
          <option value="" disabled>Elegí la categoría</option>
          {tournaments.map((t) => (
            <optgroup key={t} label={t}>
              {categories.filter((c) => c.tournament === t).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <PlayerFields n={1} />
      <PlayerFields n={2} />
      <div className="card space-y-3 p-4">
        <div>
          <label className="label">Disponibilidad horaria</label>
          <textarea name="availability" rows={3} className="input" placeholder="Ej: jueves y viernes después de las 19 hs. No podemos el viernes antes de las 21." />
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm">
          <input type="checkbox" name="weekend" className="mt-0.5 h-5 w-5 accent-[var(--brand)]" />
          <span>Confirmamos que estamos disponibles <b>sábado y domingo</b>, cuando se juegan las instancias finales.</span>
        </label>
      </div>
      {state?.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{state.error}</p>}
      <button className="btn-primary w-full py-3.5 text-base" disabled={pending}>{pending ? "Enviando..." : "Enviar inscripción"}</button>
    </form>
  );
}
