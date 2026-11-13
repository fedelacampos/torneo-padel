import Link from "next/link";

export function Header({ complex, admin = false }: { complex: { slug: string; name: string; logoUrl: string | null; primaryColor: string }; admin?: boolean }) {
  const base = `/${complex.slug}`;
  return (
    <>
      <style>{`:root{--brand:${complex.primaryColor}}`}</style>
      <header className="sticky top-0 z-20 text-white shadow" style={{ background: "var(--brand)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href={admin ? `${base}/admin` : base} className="flex min-w-0 items-center gap-2">
            {complex.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={complex.logoUrl} alt="" className="h-8 w-8 rounded-full bg-white object-cover" />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-sm font-bold">{complex.name[0]}</span>
            )}
            <span className="truncate font-bold">{complex.name}</span>
            {admin && <span className="chip bg-white/20">Admin</span>}
          </Link>
          <nav className="ml-auto flex shrink-0 gap-1 whitespace-nowrap text-sm font-medium">
            {admin ? (
              <Link href={base} className="rounded-lg px-2.5 py-1.5 hover:bg-white/15">Ver web</Link>
            ) : (
              <>
                <Link href={`${base}/inscripcion`} className="rounded-lg px-2.5 py-1.5 hover:bg-white/15">Inscribirme</Link>
                <Link href={`${base}/ranking`} className="rounded-lg px-2.5 py-1.5 hover:bg-white/15">Ranking</Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
