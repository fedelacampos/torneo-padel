import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { saveSettings } from "../actions";
import { parsePoints, POINTS_LABEL, type RankingPoints } from "@/lib/ranking";

export default async function Ajustes({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const c = await requireAdmin(slug);
  const pts = parsePoints(c.rankingPoints);
  return (
    <>
      <Header complex={c} admin />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="h1 mb-4">Ajustes del complejo</h1>
        <ActionForm action={saveSettings} className="space-y-4" submit="Guardar cambios" submitClass="btn-primary w-full">
          <input type="hidden" name="slug" value={slug} />
          <div className="card grid gap-3 p-4 sm:grid-cols-2">
            <h2 className="h2 sm:col-span-2">Marca</h2>
            <div className="sm:col-span-2"><label className="label">Nombre del complejo</label><input name="name" defaultValue={c.name} className="input" /></div>
            <div><label className="label">Logo (URL de imagen)</label><input name="logoUrl" defaultValue={c.logoUrl ?? ""} className="input" /></div>
            <div><label className="label">Color principal</label><input name="primaryColor" type="color" defaultValue={c.primaryColor} className="h-11 w-full rounded-xl border border-neutral-300" /></div>
          </div>
          <div className="card grid gap-3 p-4">
            <h2 className="h2">Cobros y contacto</h2>
            <div><label className="label">WhatsApp del organizador (recibe avisos de pago)</label><input name="adminWhatsapp" defaultValue={c.adminWhatsapp ?? ""} className="input" placeholder="5491123456789" inputMode="tel" /></div>
            <div><label className="label">Link de pago de Mercado Pago</label><input name="mpLink" defaultValue={c.mpLink ?? ""} className="input" placeholder="https://mpago.la/..." /></div>
            <div><label className="label">Alias para transferencias</label><input name="mpAlias" defaultValue={c.mpAlias ?? ""} className="input" placeholder="complejo.padel.mp" /></div>
          </div>
          <div className="card p-4">
            <h2 className="h2 mb-3">Puntos del ranking</h2>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(POINTS_LABEL) as (keyof RankingPoints)[]).map((k) => (
                <div key={k}><label className="label">{POINTS_LABEL[k]}</label><input name={`pts_${k}`} type="number" min="0" defaultValue={pts[k]} className="input" /></div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <label className="label">Nueva contraseña de administrador (dejar vacío para no cambiar)</label>
            <input name="newPassword" type="password" className="input" autoComplete="new-password" />
          </div>
        </ActionForm>
      </main>
    </>
  );
}
