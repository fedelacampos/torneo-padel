import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Logo } from "@/components/Header";
import { BrandVars, Cover } from "@/components/Cover";
import { inkFor } from "@/lib/theme";

export default async function MiraTuPartido({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  return (
    <>
      <BrandVars color={complex.primaryColor} ink={inkFor(complex.primaryColor)} />
      <Cover url={complex.coverUrl} />
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center text-white">
        <Logo complex={complex} size={72} />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[.3em] text-white/70">Mirá tu partido</p>
        <h1 className="font-display mt-2 -rotate-2 rounded-xl px-6 py-3 text-5xl font-extrabold uppercase shadow-2xl"
          style={{ background: "var(--brand)", color: "var(--brand-ink)" }}>¡Próximamente!</h1>
        <p className="mt-6 max-w-xs text-sm text-white/80">Muy pronto vas a poder ver los videos de tus partidos desde acá.</p>
        <Link href={`/${slug}/inicio`} className="btn-outline-light mt-8">‹ Volver al menú</Link>
      </main>
    </>
  );
}
