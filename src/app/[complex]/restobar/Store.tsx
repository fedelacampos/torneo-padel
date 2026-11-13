"use client";
import { useEffect, useMemo, useState } from "react";

type Product = { id: string; name: string; description: string | null; price: number; category: string; imageUrl: string | null };
type Info = { slug: string; name: string; whatsapp: string | null; mpLink: string | null; mpAlias: string | null };

const money = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export function Store({ products, info }: { products: Product[]; info: Info }) {
  const key = `cart:${info.slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<null | { total: number; pay: string }>(null);
  const [form, setForm] = useState({ name: "", place: "", pay: "Mercado Pago", notes: "" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      if (saved && typeof saved === "object") setCart(saved);
      const f = JSON.parse(localStorage.getItem(key + ":form") || "null");
      if (f) setForm((x) => ({ ...x, name: f.name ?? "", place: f.place ?? "" }));
    } catch {}
  }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(cart)); } catch {} }, [key, cart]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart).filter(([id, q]) => q > 0 && byId.has(id)).map(([id, q]) => ({ p: byId.get(id)!, q }));
  const count = lines.reduce((n, l) => n + l.q, 0);
  const total = lines.reduce((n, l) => n + l.q * l.p.price, 0);
  const categories = [...new Set(products.map((p) => p.category))];

  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  function send() {
    const msg = [
      `¡Hola ${info.name}! Quiero hacer un pedido:`,
      "",
      ...lines.map((l) => `• ${l.q} x ${l.p.name} — ${money(l.q * l.p.price)}`),
      "",
      `*Total: ${money(total)}*`,
      `Nombre: ${form.name}`,
      ...(form.place ? [`Entregar en: ${form.place}`] : []),
      `Pago: ${form.pay}`,
      ...(form.notes ? [`Aclaraciones: ${form.notes}`] : []),
    ].join("\n");
    const phone = (info.whatsapp || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    try { localStorage.setItem(key + ":form", JSON.stringify({ name: form.name, place: form.place })); } catch {}
    setSent({ total, pay: form.pay });
    setCart({});
    setOpen(false);
  }

  if (products.length === 0)
    return <p className="card p-6 text-center text-neutral-500">Todavía no hay productos cargados.</p>;

  return (
    <>
      {sent && (
        <div className="card mb-6 space-y-3 p-5 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full text-2xl" style={{ background: "var(--brand)", color: "var(--brand-ink)" }}>✓</div>
          <h2 className="font-display text-2xl font-bold uppercase">¡Pedido enviado!</h2>
          <p className="text-sm text-neutral-600">Te confirmamos por WhatsApp. Total: <b>{money(sent.total)}</b></p>
          {sent.pay === "Mercado Pago" && (
            <div className="space-y-2">
              {info.mpLink && <a href={info.mpLink} target="_blank" rel="noopener noreferrer" className="btn-mp w-full py-3 text-base">Pagar con Mercado Pago</a>}
              {info.mpAlias && <p className="rounded-xl bg-neutral-100 p-3 text-sm">Alias para transferir: <b>{info.mpAlias}</b></p>}
              <p className="text-xs text-neutral-500">Mandá el comprobante por el mismo chat de WhatsApp.</p>
            </div>
          )}
          <button className="text-sm underline" onClick={() => setSent(null)}>Hacer otro pedido</button>
        </div>
      )}

      {categories.length > 1 && (
        <nav className="sticky top-[60px] z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-[var(--paper)] px-4 py-2">
          {categories.map((c) => (
            <a key={c} href={`#cat-${encodeURIComponent(c)}`} className="chip-off shrink-0">{c}</a>
          ))}
        </nav>
      )}

      <div className="space-y-8 pb-28">
        {categories.map((c) => (
          <section key={c} id={`cat-${encodeURIComponent(c)}`} className="scroll-mt-32">
            <h2 className="h2 mb-3">{c}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {products.filter((p) => p.category === c).map((p) => {
                const q = cart[p.id] ?? 0;
                return (
                  <div key={p.id} className={`card flex gap-3 overflow-hidden p-2.5 ${q ? "ring-2 ring-[var(--ink)]" : ""}`}>
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                      {p.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                        : <div className="grid h-full place-items-center text-3xl text-neutral-300">🍽</div>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="font-semibold leading-tight">{p.name}</p>
                      {p.description && <p className="line-clamp-2 text-xs text-neutral-500">{p.description}</p>}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <span className="font-display text-xl font-bold">{money(p.price)}</span>
                        {q === 0 ? (
                          <button onClick={() => add(p.id, 1)} className="btn-primary px-3 py-1.5">Agregar</button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button onClick={() => add(p.id, -1)} className="btn-ghost h-9 w-9 p-0 text-lg" aria-label="Quitar uno">−</button>
                            <span className="font-display w-7 text-center text-xl font-bold">{q}</span>
                            <button onClick={() => add(p.id, 1)} className="btn-dark h-9 w-9 p-0 text-lg" aria-label="Agregar uno">+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {count > 0 && !open && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <button onClick={() => setOpen(true)} className="btn-primary mx-auto flex w-full max-w-xl justify-between px-5 py-4 text-base shadow-2xl ring-1 ring-black/10">
            <span className="flex items-center gap-2"><span className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--ink)] px-1.5 text-sm text-white">{count}</span>Ver pedido</span>
            <span className="font-display text-xl">{money(total)}</span>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={() => setOpen(false)}>
          <div className="max-h-[92svh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold uppercase">Tu pedido</h2>
              <button onClick={() => setOpen(false)} className="btn-ghost h-9 w-9 p-0" aria-label="Cerrar">✕</button>
            </div>
            <ul className="divide-y divide-neutral-100">
              {lines.map(({ p, q }) => (
                <li key={p.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-neutral-500">{money(p.price)} c/u</p></div>
                  <button onClick={() => add(p.id, -1)} className="btn-ghost h-8 w-8 p-0">−</button>
                  <span className="w-6 text-center font-bold">{q}</span>
                  <button onClick={() => add(p.id, 1)} className="btn-ghost h-8 w-8 p-0">+</button>
                  <span className="w-20 text-right font-semibold tabular-nums">{money(p.price * q)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t-2 border-[var(--ink)] pt-3">
              <span className="font-display text-xl font-bold uppercase">Total</span>
              <span className="font-display text-3xl font-extrabold">{money(total)}</span>
            </div>
            <div className="mt-4 space-y-3">
              <div><label className="label">Tu nombre *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></div>
              <div><label className="label">¿Dónde te lo llevamos?</label><input className="input" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Ej: cancha 3, mesa 5, retiro en barra" /></div>
              <div>
                <span className="label">Forma de pago</span>
                <div className="grid grid-cols-2 gap-2">
                  {["Mercado Pago", "Efectivo"].map((m) => (
                    <button key={m} type="button" onClick={() => setForm({ ...form, pay: m })}
                      className={`btn py-3 ${form.pay === m ? "bg-[var(--ink)] text-white" : "bg-neutral-100 text-neutral-700"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div><label className="label">Aclaraciones</label><textarea rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej: sin hielo, la hamburguesa sin cebolla" /></div>
            </div>
            {!info.whatsapp && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">El complejo todavía no cargó su WhatsApp para pedidos.</p>}
            <button onClick={send} disabled={!form.name.trim() || !info.whatsapp}
              className="btn-wa mt-4 w-full py-4 text-base">Enviar pedido por WhatsApp</button>
          </div>
        </div>
      )}
    </>
  );
}
