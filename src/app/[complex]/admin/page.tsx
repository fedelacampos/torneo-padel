import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { createTournament, logout } from "./actions";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminHome({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await requireAdmin(slug);
  const tournaments = await db.tournament.findMany({
    where: { complexId: complex.id },
    orderBy: { startDate: "desc" },
    include: { categories: { include: { _count: { select: { pairs: true } } } } },
  });
  const pending = await db.pair.count({ where: { status: "PENDING", category: { tournament: { complexId: complex.id } } } });
  const informed = await db.pair.count({
    where: { OR: [{ pay1Status: "INFORMADO" }, { pay2Status: "INFORMADO" }], category: { tournament: { complexId: complex.id } } },
  });

  return (
    <>
      <Header complex={complex} admin />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {(pending > 0 || informed > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {pending > 0 && <div className="card border-l-4 border-amber-400 p-3 text-sm"><b>{pending}</b> inscripciones esperando confirmación</div>}
            {informed > 0 && <div className="card border-l-4 border-sky-400 p-3 text-sm"><b>{informed}</b> parejas informaron un pago por Mercado Pago</div>}
          </div>
        )}

        <section>
          <h2 className="h2 mb-3">Torneos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/${slug}/admin/torneo/${t.id}`} className="card block p-4 hover:ring-black/30">
                <p className="font-bold">{t.name}</p>
                <p className="text-sm text-neutral-500">{fmtDate(t.startDate)} al {fmtDate(t.endDate)}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {t.categories.length} categorías · {t.categories.reduce((n, c) => n + c._count.pairs, 0)} parejas
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="h2 mb-3">Nuevo torneo</h2>
          <ActionForm action={createTournament} className="grid gap-3 sm:grid-cols-2" submit="Crear torneo">
            <input type="hidden" name="slug" value={slug} />
            <div className="sm:col-span-2"><label className="label">Nombre</label><input name="name" className="input" placeholder="Torneo de Primavera" required /></div>
            <div><label className="label">Desde</label><input name="startDate" type="date" className="input" required /></div>
            <div><label className="label">Hasta</label><input name="endDate" type="date" className="input" required /></div>
            <div><label className="label">Inscripción por jugador ($)</label><input name="entryFee" type="number" min="0" className="input" placeholder="0" /></div>
            <div><label className="label">Teléfonos de contacto</label><input name="contactPhones" className="input" placeholder="11 2345-6789, 11 5555-4444" defaultValue={complex.adminWhatsapp ?? ""} /></div>
            <div className="sm:col-span-2"><label className="label">Descripción (aclaraciones para los jugadores)</label><textarea name="notes" rows={3} className="input" placeholder="Ej: incluye pelotas nuevas y hidratación. Premios para campeones y finalistas." /></div>
          </ActionForm>
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href={`/${slug}/admin/restobar`} className="btn-ghost">Restobar</Link>
          <Link href={`/${slug}/admin/ajustes`} className="btn-ghost">Ajustes del complejo</Link>
          <form action={logout}><input type="hidden" name="slug" value={slug} /><button className="btn-ghost">Salir</button></form>
        </div>
      </main>
    </>
  );
}
