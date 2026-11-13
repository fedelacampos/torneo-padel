"use client";
import { useFormAction } from "./useFormAction";

type State = { error?: string; ok?: string } | undefined;

/** Formulario que muestra el mensaje de error/éxito que devuelve la acción del servidor. */
export function ActionForm({
  action, children, className = "", submit, submitClass = "btn-primary", resetOnOk = false,
}: {
  action: (s: State, fd: FormData) => Promise<State>;
  children: React.ReactNode;
  className?: string;
  submit?: string;
  submitClass?: string;
  resetOnOk?: boolean;
}) {
  const { state, pending, ref, onSubmit } = useFormAction(action, resetOnOk);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children}
      {submit && <button className={submitClass} disabled={pending}>{pending ? "Guardando..." : submit}</button>}
      {state?.error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  );
}
