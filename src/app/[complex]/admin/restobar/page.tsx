import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { ImageUpload } from "@/components/ImageUpload";
import { money } from "@/lib/format";
import { deleteProduct, saveProduct, toggleProduct } from "../actions";

export const dynamic = "force-dynamic";

type P = { id: string; name: string; description: string | null; price: number; category: string; imageUrl: string | null; available: boolean };

function ProductFields({ p, categories }: { p?: P; categories: string[] }) {
  return (
    <>
      <ImageUpload name="imageUrl" current={p?.imageUrl} label="Foto" maxSize={900} aspect="aspect-square" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Nombre *</label><input name="name" defaultValue={p?.name} className="input" required placeholder="Hamburguesa completa" /></div>
        <div><label className="label">Precio ($) *</label><input name="price" defaultValue={p?.price} className="input" inputMode="numeric" required placeholder="8500" /></div>
        <div>
          <label className="label">Categoría</label>
          <input name="category" defaultValue={p?.category ?? ""} className="input" list="product-cats" placeholder="Bebidas, Comidas, Cafetería..." />
          <datalist id="product-cats">{[...new Set([...categories, "Bebidas", "Comidas", "Cafetería", "Snacks", "Promos"])].map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="sm:col-span-2"><label className="label">Descripción</label><input name="description" defaultValue={p?.description ?? ""} className="input" placeholder="Con papas fritas" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="available" defaultChecked={p ? p.available : true} className="h-5 w-5 accent-black" /> Disponible para la venta</label>
      </div>
    </>
  );
}

export default async function AdminRestobar({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await requireAdmin(slug);
  const products = await db.product.findMany({ where: { complexId: complex.id }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const categories = [...new Set(products.map((p) => p.category))];
  const h = (id: string) => (<><input type="hidden" name="slug" value={slug} /><input type="hidden" name="productId" value={id} /></>);
  const whatsapp = complex.restobarWhatsapp || complex.adminWhatsapp;

  return (
    <>
      <Header complex={complex} admin />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <Link href={`/${slug}/admin`} className="text-sm text-neutral-500">‹ Panel</Link>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h1 className="h1">Restobar</h1>
            <Link href={`/${slug}/restobar`} target="_blank" className="btn-ghost px-3 py-1.5">Ver tienda ↗</Link>
          </div>
          {!whatsapp && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Cargá el WhatsApp que recibe los pedidos en <Link className="underline" href={`/${slug}/admin/ajustes`}>Ajustes</Link>.
            </p>
          )}
        </div>

        <section className="card p-4">
          <h2 className="h2 mb-3">Nuevo producto</h2>
          <ActionForm action={saveProduct} className="space-y-3" submit="Agregar producto" resetOnOk>
            <input type="hidden" name="slug" value={slug} />
            <ProductFields categories={categories} />
          </ActionForm>
        </section>

        {categories.map((c) => (
          <section key={c}>
            <h2 className="h2 mb-2">{c}</h2>
            <div className="space-y-2">
              {products.filter((p) => p.category === c).map((p) => (
                <details key={p.id} className={`card overflow-hidden ${p.available ? "" : "opacity-60"}`}>
                  <summary className="flex cursor-pointer items-center gap-3 p-2.5">
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-xl text-neutral-300">🍽</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="font-display text-lg font-bold">{money(p.price)}</span>
                      {!p.available && <span className="chip ml-2 bg-neutral-200 text-neutral-700">Sin stock</span>}
                    </span>
                    <span className="text-xs font-semibold text-neutral-500">Editar</span>
                  </summary>
                  <div className="space-y-3 border-t border-neutral-100 p-3">
                    <ActionForm action={saveProduct} className="space-y-3" submit="Guardar cambios">
                      {h(p.id)}
                      <ProductFields p={p} categories={categories} />
                    </ActionForm>
                    <div className="flex gap-2 border-t border-neutral-100 pt-3">
                      <form action={toggleProduct}>{h(p.id)}<button className="btn-ghost px-3 py-1.5 text-xs">{p.available ? "Marcar sin stock" : "Volver a vender"}</button></form>
                      <form action={deleteProduct} className="ml-auto">{h(p.id)}<button className="text-xs text-red-700 underline">Eliminar</button></form>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
        {products.length === 0 && <p className="text-sm text-neutral-500">Todavía no cargaste productos.</p>}
      </main>
    </>
  );
}
