import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { ImageUpload } from "@/components/ImageUpload";
import { saveSettings } from "../actions";
import { parsePoints, POINTS_LABEL, type RankingPoints } from "@/lib/ranking";
import { DEFAULT_REJECT, DEFAULT_WELCOME, PLACEHOLDERS } from "@/lib/messages";

export default async function Ajustes({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const c = await requireAdmin(slug);
  const pts = parsePoints(c.rankingPoints);
  return (
    <>
      <Header complex={c} admin />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href={`/${slug}/admin`} className="text-sm text-neutral-500">‹ Panel</Link>
        <h1 className="h1 mb-4">Ajustes del complejo</h1>
        <ActionForm action={saveSettings} className="space-y-4" submit="Guardar cambios" submitClass="btn-primary w-full py-3">
          <input type="hidden" name="slug" value={slug} />
          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <h2 className="h2 sm:col-span-2">Marca</h2>
            <div className="sm:col-span-2"><label className="label">Nombre del complejo</label><input name="name" defaultValue={c.name} className="input" /></div>
            <ImageUpload name="logoUrl" current={c.logoUrl} label="Logo" round keepPng maxSize={512} />
            <div><label className="label">Color principal</label><input name="primaryColor" type="color" defaultValue={c.primaryColor} className="h-11 w-full rounded-xl border border-neutral-300" /></div>
            <div className="sm:col-span-2">
              <ImageUpload name="coverUrl" current={c.coverUrl} label="Foto de portada (se ve de fondo en la entrada y el menú)" maxSize={1600} aspect="aspect-[3/4]" />
            </div>
          </div>
          <div className="card grid gap-3 p-4">
            <h2 className="h2">Links y contacto</h2>
            <div><label className="label">Localidad / dirección del complejo</label><input name="location" defaultValue={c.location ?? ""} className="input" placeholder="Ej: Ruta 92 km 3, Ciudad, Provincia" /></div>
            <div><label className="label">Link para reservar cancha</label><input name="bookingUrl" defaultValue={c.bookingUrl ?? ""} className="input" placeholder="https://..." inputMode="url" /></div>
            <div><label className="label">WhatsApp del organizador (recibe avisos de pago de torneos)</label><input name="adminWhatsapp" defaultValue={c.adminWhatsapp ?? ""} className="input" placeholder="5491123456789" inputMode="tel" /></div>
            <div><label className="label">WhatsApp del restobar (recibe los pedidos; si lo dejás vacío se usa el de arriba)</label><input name="restobarWhatsapp" defaultValue={c.restobarWhatsapp ?? ""} className="input" placeholder="5491123456789" inputMode="tel" /></div>
          </div>
          <div className="card grid gap-3 p-4">
            <h2 className="h2">Cobros</h2>
            <div><label className="label">Link de pago de Mercado Pago</label><input name="mpLink" defaultValue={c.mpLink ?? ""} className="input" placeholder="https://mpago.la/..." /></div>
            <div><label className="label">Alias para transferencias</label><input name="mpAlias" defaultValue={c.mpAlias ?? ""} className="input" placeholder="complejo.padel.mp" /></div>
          </div>
          <div className="card grid gap-3 p-4">
            <h2 className="h2">Mensajes de inscripción</h2>
            <p className="text-xs text-neutral-500">Podés usar: {PLACEHOLDERS}</p>
            <div><label className="label">Al confirmar una inscripción</label><textarea name="welcomeMessage" rows={2} defaultValue={c.welcomeMessage || DEFAULT_WELCOME} className="input" /></div>
            <div><label className="label">Al cancelar por categoría</label><textarea name="rejectMessage" rows={6} defaultValue={c.rejectMessage || DEFAULT_REJECT} className="input" /></div>
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
