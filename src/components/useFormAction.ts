"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";

type State = { error?: string; ok?: string } | undefined;

/**
 * Como useActionState, pero sin el borrado automático del formulario que hace React
 * al terminar la acción: si hay un error, lo que escribió el usuario queda cargado.
 * Con resetOnOk, se limpia solo cuando la acción salió bien.
 */
export function useFormAction(action: (s: State, fd: FormData) => Promise<State>, resetOnOk = false) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => run(fd));
  };
  return { state, pending, ref, onSubmit };
}
