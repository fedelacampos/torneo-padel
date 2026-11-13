import Link from "next/link";
import { FORMAT_LABEL } from "@/lib/tournament";
import { MATCH_FORMAT_LABEL, type MatchFormat } from "@/lib/scoring";
import { fmtDate, money, normalizePhone } from "@/lib/format";

type Props = {
  slug: string;
  category: { id: string; name: string; eventName: string | null; modality: string; format: string; matchFormat: string; status: string };
  tournament: { id: string; name: string; startDate: Date; endDate: Date; entryFee: number; registrationOpen: boolean; notes: string | null; contactPhones: string | null };
  complex: { location: string | null; adminWhatsapp: string | null };
};

const SHORT_MATCH: Record<string, string> = {
  BEST_OF_3: "al mejor de 3 sets",
  SUPER_TB: "2 sets + supertiebreak a 10",
};

export function eventStatus(status: string, registrationOpen: boolean): { label: string; style: React.CSSProperties; cls: string } {
  if (status === "REGISTRATION")
    return registrationOpen
      ? { label: "Inscripción abierta", cls: "", style: { background: "var(--brand)", color: "var(--brand-ink)" } }
      : { label: "Inscripción cerrada", cls: "bg-neutral-200 text-neutral-800", style: {} };
  if (status === "FINISHED") return { label: "Finalizado", cls: "bg-neutral-800 text-white", style: {} };
  return { label: "En juego", cls: "bg-emerald-600 text-white", style: {} };
}

/** Separa "11 2345-6789, 11 5555 4444" en teléfonos individuales. */
function phones(raw: string | null, fallback: string | null): { label: string; wa: string }[] {
  const list = (raw ?? "").split(/[,;/\n]+/).map((x) => x.trim()).filter(Boolean);
  if (list.length === 0 && fallback) list.push("+" + fallback);
  return list.map((label) => ({ label, wa: normalizePhone(label) }));
}

/** Ficha del evento: los datos principales de la categoría dentro del torneo. */
export function EventInfo({ slug, category: c, tournament: t, complex, open }: Props & { open: boolean }) {
  const st = eventStatus(c.status, t.registrationOpen);
  const tel = phones(t.contactPhones, complex.adminWhatsapp);
  const sameDay = fmtDate(t.startDate) === fmtDate(t.endDate);
  const rows: [string, React.ReactNode][] = [
    ["Nombre del evento", c.eventName || c.name],
    ["Nombre del torneo", t.name],
    ["Fecha", sameDay ? fmtDate(t.startDate) : `${fmtDate(t.startDate)} al ${fmtDate(t.endDate)}`],
    ["Sistema de competencia", <>{FORMAT_LABEL[c.format]} · {SHORT_MATCH[c.matchFormat] ?? MATCH_FORMAT_LABEL[c.matchFormat as MatchFormat]}</>],
    ["Modalidad", c.modality],
    ["Categoría", c.name],
    ["Estado del torneo", <span key="st" className={`chip ${st.cls}`} style={st.style}>{st.label}</span>],
    ["Costo de inscripción", t.entryFee > 0 ? <>{money(t.entryFee)} <span className="text-neutral-500">por jugador</span></> : "Sin costo"],
  ];
  if (complex.location)
    rows.push(["Localidad", (
      <a key="loc" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complex.location)}`} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--brand)] decoration-2 underline-offset-2">
        {complex.location}
      </a>
    )]);
  if (tel.length)
    rows.push(["Teléfonos de contacto", (
      <span key="tel" className="flex flex-wrap gap-x-3 gap-y-1">
        {tel.map((p) => (
          <a key={p.label} href={`https://wa.me/${p.wa}`} target="_blank" rel="noopener noreferrer" className="underline decoration-[var(--brand)] decoration-2 underline-offset-2">{p.label}</a>
        ))}
      </span>
    )]);

  const canRegister = c.status === "REGISTRATION" && t.registrationOpen;

  return (
    <details open={open} className="card group mb-6 overflow-hidden">
      <summary className="font-display flex cursor-pointer list-none items-center justify-between bg-[var(--ink)] px-4 py-2.5 text-lg font-bold uppercase tracking-wide text-white">
        <span>Información del evento</span>
        <span className="text-sm transition group-open:rotate-180" style={{ color: "var(--brand)" }}>▼</span>
      </summary>
      <dl className="divide-y divide-neutral-100 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-4 py-2.5">
            <dt className="text-neutral-500">{k}</dt>
            <dd className="font-semibold text-neutral-900">{v}</dd>
          </div>
        ))}
      </dl>
      {t.notes && (
        <div className="border-t border-neutral-100 px-4 py-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Descripción</p>
          <p className="whitespace-pre-line text-sm">{t.notes}</p>
        </div>
      )}
      {canRegister && (
        <div className="border-t border-neutral-100 p-4">
          <Link href={`/${slug}/inscripcion?torneo=${t.id}&cat=${c.id}`} className="btn-primary w-full py-3 text-base">Inscribirme en {c.eventName || c.name}</Link>
        </div>
      )}
    </details>
  );
}
