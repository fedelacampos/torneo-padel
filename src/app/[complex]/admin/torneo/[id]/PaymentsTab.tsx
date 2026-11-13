import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { setPayment } from "../../actions";

const CHIP: Record<string, string> = {
  PENDIENTE: "bg-slate-100 text-slate-700",
  INFORMADO: "bg-amber-100 text-amber-800",
  PAGADO: "bg-emerald-100 text-emerald-800",
};

export async function PaymentsTab({ slug, tournamentId, fee }: { slug: string; tournamentId: string; fee: number }) {
  const cats = await db.category.findMany({
    where: { tournamentId },
    orderBy: { name: "asc" },
    include: { pairs: { where: { status: { not: "REJECTED" } }, include: { player1: true, player2: true }, orderBy: { createdAt: "asc" } } },
  });
  const all = cats.flatMap((c) => c.pairs.flatMap((p) => [p.pay1Status, p.pay2Status]));
  const paid = all.filter((s) => s === "PAGADO").length;
  const informed = all.filter((s) => s === "INFORMADO").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="card p-3"><p className="text-2xl font-bold text-emerald-700">{paid}</p><p className="text-xs text-slate-500">pagaron · {money(paid * fee)}</p></div>
        <div className="card p-3"><p className="text-2xl font-bold text-amber-700">{informed}</p><p className="text-xs text-slate-500">informaron MP</p></div>
        <div className="card p-3"><p className="text-2xl font-bold">{all.length - paid - informed}</p><p className="text-xs text-slate-500">deben · {money((all.length - paid) * fee)}</p></div>
      </div>

      {cats.map((c) => (
        <section key={c.id}>
          <h2 className="h2 mb-2">{c.name}</h2>
          <div className="card divide-y divide-slate-100">
            {c.pairs.flatMap((p) =>
              ([1, 2] as const).map((n) => {
                const pl = n === 1 ? p.player1 : p.player2;
                const status = n === 1 ? p.pay1Status : p.pay2Status;
                const method = n === 1 ? p.pay1Method : p.pay2Method;
                return (
                  <form key={p.id + n} action={setPayment} className={`flex flex-wrap items-center gap-2 px-3 py-2.5 ${n === 2 ? "pt-0" : ""}`}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="pairId" value={p.id} />
                    <input type="hidden" name="player" value={n} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pl.fullName}</p>
                      <span className={`chip ${CHIP[status]}`}>{status === "PAGADO" ? `Pagado · ${method ?? ""}` : status === "INFORMADO" ? "Informó pago por MP" : "Pendiente"}</span>
                    </div>
                    {status === "PAGADO" ? (
                      <button name="method" value="" className="btn-ghost px-3 py-1.5 text-xs">Desmarcar</button>
                    ) : (
                      <div className="flex gap-1">
                        {status === "INFORMADO" && <button name="method" value="Mercado Pago" className="btn-mp px-3 py-1.5 text-xs">Confirmar MP</button>}
                        <button name="method" value="Efectivo" className="btn-ghost px-3 py-1.5 text-xs">Efectivo</button>
                        <button name="method" value="Transferencia" className="btn-ghost px-3 py-1.5 text-xs">Transf.</button>
                      </div>
                    )}
                  </form>
                );
              }),
            )}
            {c.pairs.length === 0 && <p className="p-3 text-sm text-slate-500">Sin parejas.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}
