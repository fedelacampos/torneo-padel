import { ActionForm } from "@/components/ActionForm";
import { MatchCard } from "@/components/MatchCard";
import { ResultForm } from "@/components/ResultForm";
import { roundLabel } from "@/lib/draw";
import { pairName, toLocalInput } from "@/lib/format";
import { parseSets, type MatchFormat } from "@/lib/scoring";
import type { CategoryFull } from "@/lib/tournament";
import { clearMatchResult, saveMatchResult, scheduleMatch } from "../../actions";

export function MatchesTab({ slug, cat }: { slug: string; cat: CategoryFull }) {
  if (cat.matches.length === 0)
    return <p className="card p-4 text-neutral-600">Todavía no hay partidos. Hacé el sorteo desde la pestaña <b>Categorías</b>.</p>;

  // Grupos: rondas del cuadro primero (lo más reciente arriba), luego zonas / americano.
  const groups: { title: string; matches: CategoryFull["matches"] }[] = [];
  const ko = cat.matches.filter((m) => m.stage === "KO");
  for (const r of [...new Set(ko.map((m) => m.round))].sort((a, b) => a - b))
    groups.push({ title: roundLabel(r), matches: ko.filter((m) => m.round === r) });
  for (const z of cat.zones) groups.push({ title: z.name, matches: cat.matches.filter((m) => m.zoneId === z.id) });
  const am = cat.matches.filter((m) => m.stage === "AMERICANO");
  if (am.length) groups.push({ title: "Fixture americano", matches: am });

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="h2 mb-2">{g.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {g.matches.map((m) => {
              const bye = m.labelA === "Pase directo" || m.labelB === "Pase directo";
              if (bye) return <MatchCard key={m.id} m={m} empty="Pase directo" />;
              const ready = m.pairA && m.pairB;
              const woSide = m.walkover ? (m.winnerId === m.pairAId ? "A" : "B") : null;
              return (
                <div key={m.id} className="space-y-0">
                  <MatchCard m={m} />
                  <details className="-mt-2 rounded-b-2xl bg-white px-3 pb-3 pt-3 ring-1 ring-neutral-200" open={!!ready && !m.winnerId && !!m.scheduledAt}>
                    <summary className="cursor-pointer text-sm font-semibold text-neutral-900 underline decoration-[var(--brand)] decoration-[3px] underline-offset-4">
                      {m.winnerId ? "Editar resultado / horario" : ready ? "Cargar resultado / horario" : "Asignar horario"}
                    </summary>
                    <div className="mt-3 space-y-4">
                      <ActionForm action={scheduleMatch} className="flex flex-wrap items-end gap-2" submit="Guardar horario" submitClass="btn-ghost">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="matchId" value={m.id} />
                        <div><label className="label text-xs">Día y hora</label><input type="datetime-local" name="scheduledAt" defaultValue={toLocalInput(m.scheduledAt)} className="input py-2 text-sm" /></div>
                        <div><label className="label text-xs">Cancha</label><input name="court" defaultValue={m.court ?? ""} className="input w-20 py-2 text-sm" placeholder="1" /></div>
                      </ActionForm>
                      {ready && (
                        <ResultForm
                          slug={slug}
                          matchId={m.id}
                          format={cat.matchFormat as MatchFormat}
                          nameA={pairName(m.pairA)}
                          nameB={pairName(m.pairB)}
                          initial={parseSets(m.sets)}
                          walkover={woSide}
                          hasResult={!!m.winnerId}
                          save={saveMatchResult}
                          clear={clearMatchResult}
                        />
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
