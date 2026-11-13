import Link from "next/link";
import { inkFor } from "@/lib/theme";

type C = { slug: string; name: string; logoUrl: string | null; primaryColor: string };

export function Logo({ complex, size = 36 }: { complex: C; size?: number }) {
  return complex.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={complex.logoUrl} alt={complex.name} width={size} height={size} className="shrink-0 rounded-full object-contain" style={{ width: size, height: size }} />
  ) : (
    <span className="font-display grid shrink-0 place-items-center rounded-full font-bold" style={{ width: size, height: size, background: "var(--brand)", color: "var(--brand-ink)", fontSize: size * 0.45 }}>
      {complex.name[0]}
    </span>
  );
}

export function Header({ complex, admin = false }: { complex: C; admin?: boolean }) {
  const base = `/${complex.slug}`;
  const link = "rounded-lg px-2 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white";
  return (
    <>
      <style>{`:root{--brand:${complex.primaryColor};--brand-ink:${inkFor(complex.primaryColor)}}`}</style>
      <header className="sticky top-0 z-20 bg-[var(--ink)] text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <Link href={admin ? `${base}/admin` : `${base}/inicio`} className="flex min-w-0 items-center gap-2.5">
            <Logo complex={complex} />
            <span className="font-display truncate text-lg font-bold uppercase tracking-wide">{complex.name}</span>
            {admin && <span className="chip-brand">Admin</span>}
          </Link>
          <nav className="ml-auto flex shrink-0 gap-1 whitespace-nowrap text-sm font-medium">
            {admin ? (
              <Link href={base} className={link}>Ver web</Link>
            ) : (
              <>
                <Link href={`${base}/torneos`} className={link}>Torneos</Link>
                <Link href={`${base}/ranking`} className={link}>Ranking</Link>
                <Link href={`${base}/restobar`} className={link}>Restobar</Link>
              </>
            )}
          </nav>
        </div>
        <div className="h-1" style={{ background: "var(--brand)" }} />
      </header>
    </>
  );
}
