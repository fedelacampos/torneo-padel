import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Header } from "@/components/Header";
import { ActionForm } from "@/components/ActionForm";
import { login } from "../actions";

export default async function Login({ params }: { params: Promise<{ complex: string }> }) {
  const { complex: slug } = await params;
  const complex = await db.complex.findUnique({ where: { slug } });
  if (!complex) notFound();
  return (
    <>
      <Header complex={complex} />
      <main className="mx-auto max-w-sm px-4 py-10">
        <h1 className="h1 mb-4">Ingreso organizador</h1>
        <ActionForm action={login} className="card space-y-3 p-5" submit="Ingresar" submitClass="btn-primary w-full">
          <input type="hidden" name="slug" value={slug} />
          <div><label className="label">Contraseña</label><input name="password" type="password" className="input" required autoFocus /></div>
        </ActionForm>
      </main>
    </>
  );
}
