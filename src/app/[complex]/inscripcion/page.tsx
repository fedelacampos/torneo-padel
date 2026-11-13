import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { RegistrationForm } from "./RegistrationForm";

export const dynamic = "force-dynamic";

export default async function InscripcionPage({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  const cats = await db.category.findMany({
    where: { status: "REGISTRATION", tournament: { complexId: complex.id, registrationOpen: true } },
    include: { tournament: true },
    orderBy: [{ tournament: { startDate: "asc" } }, { name: "asc" }],
  });
  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-xl px-4 py-5">
        <h1 className="h1">Inscripción</h1>
        <p className="mb-4 text-sm text-slate-600">Completá los datos de los dos jugadores. Te contactamos por WhatsApp con los horarios.</p>
        {cats.length === 0 ? (
          <p className="card p-4 text-slate-600">No hay inscripciones abiertas en este momento.</p>
        ) : (
          <RegistrationForm slug={slug} categories={cats.map((c) => ({ id: c.id, name: c.name, tournament: c.tournament.name }))} />
        )}
      </main>
    </>
  );
}
