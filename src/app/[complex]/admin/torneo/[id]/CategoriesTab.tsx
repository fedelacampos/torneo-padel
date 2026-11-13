import { db } from "@/lib/db";
import { ActionForm } from "@/components/ActionForm";
import { FORMAT_LABEL, STATUS_LABEL } from "@/lib/tournament";
import { MATCH_FORMAT_LABEL } from "@/lib/scoring";
import { addCategory, deleteCategory, deleteTournament, drawCategory, playoffsCategory, resetCategory, updateCategory, updateTournament } from "../../actions";

type T = { id: string; name: string; entryFee: number; registrationOpen: boolean; countsForRanking: boolean };

function FormatFields({ d, locked = false }: { d?: { format: string; matchFormat: string; zoneSize: number; qualifiersPerZone: number }; locked?: boolean }) {
  return (
    <>
      <div>
        <label className="label">Formato del torneo</label>
        <select name="format" defaultValue={d?.format ?? "ZONES_KO"} className="input" disabled={locked}>
          {Object.entries(FORMAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Formato de partido</label>
        <select name="matchFormat" defaultValue={d?.matchFormat ?? "BEST_OF_3"} className="input">
          {Object.entries(MATCH_FORMAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Parejas por zona</label>
        <input name="zoneSize" type="number" min="2" max="6" defaultValue={d?.zoneSize ?? 3} className="input" disabled={locked} />
      </div>
      <div>
        <label className="label">Clasifican por zona</label>
        <input name="qualifiersPerZone" type="number" min="1" max="4" defaultValue={d?.qualifiersPerZone ?? 2} className="input" disabled={locked} />
      </div>
    </>
  );
}

export async function CategoriesTab({ slug, tournament: t }: { slug: string; tournament: T }) {
  const cats = await db.category.findMany({
    where: { tournamentId: t.id },
    orderBy: { name: "asc" },
    include: { pairs: { select: { status: true } }, matches: { select: { stage: true, winnerId: true } } },
  });
  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="tournamentId" value={t.id} />
    </>
  );

  return (
    <div className="space-y-5">
      {cats.map((c) => {
        const confirmed = c.pairs.filter((p) => p.status === "CONFIRMED").length;
        const pendingP = c.pairs.filter((p) => p.status === "PENDING").length;
        const zoneMatches = c.matches.filter((m) => m.stage === "ZONE");
        const zonesDone = zoneMatches.length > 0 && zoneMatches.every((m) => m.winnerId);
        const catHidden = (<><input type="hidden" name="slug" value={slug} /><input type="hidden" name="categoryId" value={c.id} /></>);
        return (
          <div key={c.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{c.name}</h3>
              <span className="chip bg-neutral-100 text-neutral-700">{STATUS_LABEL[c.status]}</span>
            </div>
            <p className="text-sm text-neutral-500">
              {confirmed} parejas confirmadas{pendingP > 0 && <> · <b className="text-amber-700">{pendingP} por confirmar</b></>}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {c.status === "REGISTRATION" && (
                <ActionForm action={drawCategory} submit={c.format === "KO" ? "Sortear cuadro" : c.format === "AMERICANO" ? "Armar fixture" : "Sortear zonas"}>{catHidden}</ActionForm>
              )}
              {c.format === "ZONES_KO" && c.status === "ZONES" && (
                <ActionForm action={playoffsCategory} submit={zonesDone ? "Armar cuadro con clasificados" : "Armar cuadro (faltan resultados)"} submitClass={zonesDone ? "btn-primary" : "btn-ghost"}>{catHidden}</ActionForm>
              )}
              {c.status !== "REGISTRATION" && (
                <form action={resetCategory}>{catHidden}<button className="btn-ghost text-red-700">Deshacer sorteo</button></form>
              )}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-semibold text-neutral-600">Editar categoría</summary>
              <ActionForm action={updateCategory} className="mt-3 grid gap-3 sm:grid-cols-2" submit="Guardar">
                {catHidden}
                <div className="sm:col-span-2"><label className="label">Nombre</label><input name="name" defaultValue={c.name} className="input" /></div>
                <FormatFields d={c} locked={c.status !== "REGISTRATION"} />
              </ActionForm>
              <form action={deleteCategory} className="mt-2">{catHidden}<button className="text-sm text-red-700 underline">Eliminar categoría</button></form>
            </details>
          </div>
        );
      })}

      <div className="card p-4">
        <h3 className="h2 mb-3">Agregar categoría</h3>
        <ActionForm resetOnOk action={addCategory} className="grid gap-3 sm:grid-cols-2" submit="Agregar">
          {hidden}
          <div className="sm:col-span-2">
            <label className="label">Nombre (se usa para el ranking anual)</label>
            <input name="name" className="input" placeholder="5ta Caballeros" required list="cat-names" />
            <datalist id="cat-names">
              {["8va", "7ma", "6ta", "5ta", "4ta", "3ra", "2da", "1ra"].flatMap((n) => [`${n} Caballeros`, `${n} Damas`]).concat(["Mixto", "Suma 13"]).map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <FormatFields />
        </ActionForm>
      </div>

      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Datos del torneo</summary>
        <ActionForm action={updateTournament} className="mt-3 grid gap-3 sm:grid-cols-2" submit="Guardar">
          {hidden}
          <div><label className="label">Nombre</label><input name="name" defaultValue={t.name} className="input" /></div>
          <div><label className="label">Inscripción por jugador ($)</label><input name="entryFee" type="number" min="0" defaultValue={t.entryFee} className="input" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="registrationOpen" defaultChecked={t.registrationOpen} className="h-5 w-5" /> Inscripción abierta en la web</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="countsForRanking" defaultChecked={t.countsForRanking} className="h-5 w-5" /> Suma puntos para el ranking</label>
        </ActionForm>
        <form action={deleteTournament} className="mt-4 border-t pt-3">
          {hidden}
          <button className="text-sm text-red-700 underline">Eliminar torneo completo</button>
        </form>
      </details>
    </div>
  );
}
