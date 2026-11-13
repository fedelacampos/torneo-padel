import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { Store } from "./Store";

export const dynamic = "force-dynamic";

export default async function Restobar({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  const products = await db.product.findMany({
    where: { complexId: complex.id, available: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, name: true, description: true, price: true, category: true, imageUrl: true },
  });
  return (
    <>
      <Header complex={complex} />
      <section className="hero">
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
          <p className="text-xs font-semibold uppercase tracking-[.25em]" style={{ color: "var(--brand)" }}>{complex.name}</p>
          <h1 className="font-display mt-1 text-5xl font-extrabold uppercase leading-none">Restobar</h1>
          <p className="mt-2 text-sm text-white/70">Elegí, armá tu pedido y mandalo por WhatsApp.</p>
        </div>
      </section>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Store
          products={products}
          info={{ slug, name: complex.name, whatsapp: complex.restobarWhatsapp || complex.adminWhatsapp, mpLink: complex.mpLink, mpAlias: complex.mpAlias }}
        />
      </main>
    </>
  );
}
