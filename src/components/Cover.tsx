/** Foto de portada a pantalla completa, oscurecida para que se lea el texto encima. */
export function Cover({ url, strength = "strong" }: { url: string | null; strength?: "soft" | "strong" }) {
  return (
    <div className="fixed inset-0 -z-10 bg-[var(--ink)]">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="hero h-full w-full" />
      )}
      <div className={`absolute inset-0 ${strength === "strong"
        ? "bg-gradient-to-b from-black/75 via-black/55 to-black/90"
        : "bg-gradient-to-b from-black/40 via-black/20 to-black/85"}`} />
    </div>
  );
}

export function BrandVars({ color, ink }: { color: string; ink: string }) {
  return <style>{`:root{--brand:${color};--brand-ink:${ink}}`}</style>;
}
