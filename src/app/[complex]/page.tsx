import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Logo } from "@/components/Header";
import { BrandVars, Cover } from "@/components/Cover";
import { inkFor } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** Portada: foto de fondo, logo y botón de ingreso. */
export default async function Portada({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  return (
    <>
      <BrandVars color={complex.primaryColor} ink={inkFor(complex.primaryColor)} />
      <Cover url={complex.coverUrl} strength="soft" />
      <main className="flex min-h-[100svh] flex-col items-center justify-end px-6 pb-14 text-center text-white">
        {/* Si la foto de portada ya muestra la marca, no repetimos el logo encima. */}
        {!complex.coverUrl && <Logo complex={complex} size={96} />}
        <h1 className="font-display mt-4 text-5xl font-extrabold uppercase leading-none tracking-tight drop-shadow-lg">{complex.name}</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[.3em]" style={{ color: "var(--brand)" }}>Pádel · Torneos · Restobar</p>
        <Link href={`/${slug}/inicio`} className="btn-primary font-display mt-8 w-full max-w-xs py-4 text-xl uppercase tracking-widest shadow-xl">
          Ingresar
        </Link>
      </main>
    </>
  );
}
