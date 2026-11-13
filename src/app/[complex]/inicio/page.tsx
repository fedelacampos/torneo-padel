import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Logo } from "@/components/Header";
import { BrandVars, Cover } from "@/components/Cover";
import { inkFor } from "@/lib/theme";

export const dynamic = "force-dynamic";

const ICONS = {
  cancha: <path d="M4 4h16v16H4zM4 12h16M12 4v16" />,
  partido: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4M10 9l5 2-5 2z" /></>,
  torneos: <path d="M7 4h10v4a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6" />,
  restobar: <path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v8a2 2 0 0 1-2 2M8 3v6M16 21V3c2.5 1.5 3 4 3 7h-3" />,
};

/** Menú principal del complejo. */
export default async function Inicio({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();

  const items = [
    { key: "cancha", title: "Reservá tu cancha", sub: complex.bookingUrl ? "Turnos online" : "Próximamente", href: complex.bookingUrl, external: true },
    { key: "partido", title: "Mirá tu partido", sub: "Próximamente", href: `/${slug}/partidos` },
    { key: "torneos", title: "Torneos", sub: "Inscripción, fixture, resultados y ranking", href: `/${slug}/torneos` },
    { key: "restobar", title: "Restobar", sub: "Pedí desde tu celular", href: `/${slug}/restobar` },
  ] as const;

  return (
    <>
      <BrandVars color={complex.primaryColor} ink={inkFor(complex.primaryColor)} />
      <Cover url={complex.coverUrl} />
      <main className="mx-auto flex min-h-[100svh] max-w-3xl flex-col px-4 pb-8 pt-6 text-white">
        <Link href={`/${slug}`} className="flex items-center gap-3">
          <Logo complex={complex} size={52} />
          <div>
            <p className="font-display text-2xl font-extrabold uppercase leading-none">{complex.name}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[.25em]" style={{ color: "var(--brand)" }}>Bienvenido</p>
          </div>
        </Link>

        <nav className="mt-auto grid gap-3 pt-10 sm:grid-cols-2">
          {items.map((it, i) => {
            const inner = (
              <>
                <span className="font-display absolute right-4 top-2 text-5xl font-extrabold text-white/10">0{i + 1}</span>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: "var(--brand)", color: "var(--brand-ink)" }}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{ICONS[it.key]}</svg>
                </span>
                <span className="min-w-0">
                  <span className="font-display block text-2xl font-bold uppercase leading-tight">{it.title}</span>
                  <span className="block text-sm text-white/70">{it.sub}</span>
                </span>
              </>
            );
            const cls = "group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 active:scale-[.99]";
            if (!it.href) return <div key={it.key} className={`${cls} opacity-60`}>{inner}</div>;
            return "external" in it && it.external ? (
              <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
            ) : (
              <Link key={it.key} href={it.href} className={cls}>{inner}</Link>
            );
          })}
        </nav>

        <p className="mt-8 text-center text-xs text-white/40">
          <Link href={`/${slug}/admin`} className="hover:text-white/80">Ingreso organizador</Link>
        </p>
      </main>
    </>
  );
}
