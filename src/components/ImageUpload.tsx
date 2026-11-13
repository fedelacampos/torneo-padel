"use client";
import { useRef, useState } from "react";

/**
 * Elegir una foto (desde la galería o la cámara del celular). Se achica en el navegador
 * antes de enviarla, así sube rápido aunque la foto original sea pesada.
 */
export function ImageUpload({
  name, current, label, maxSize = 1200, round = false, keepPng = false, aspect = "aspect-video",
}: {
  name: string; current?: string | null; label: string; maxSize?: number; round?: boolean; keepPng?: boolean; aspect?: string;
}) {
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const [data, setData] = useState("");
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    try {
      const bmp = await createImageBitmap(f);
      const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      // PNG mantiene la transparencia (logos); JPEG pesa menos (fotos).
      const url = keepPng && f.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82);
      setData(url); setPreview(url); setRemoved(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={removed ? "" : (current ?? "")} />
      <input type="hidden" name={`${name}_data`} value={data} />
      <input type="hidden" name={`${name}_remove`} value={removed ? "1" : ""} />
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => input.current?.click()}
          className={`relative grid shrink-0 place-items-center overflow-hidden bg-neutral-100 ring-1 ring-black/10 ${round ? "h-20 w-20 rounded-full" : `w-32 rounded-xl ${aspect}`}`}>
          {preview
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="" className={`h-full w-full ${round ? "object-contain" : "object-cover"}`} />
            : <span className="text-2xl text-neutral-400">＋</span>}
          {busy && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs">...</span>}
        </button>
        <div className="flex flex-col gap-1.5">
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => input.current?.click()}>{preview ? "Cambiar foto" : "Subir foto"}</button>
          {preview && (
            <button type="button" className="text-left text-xs text-red-700 underline" onClick={() => { setPreview(null); setData(""); setRemoved(true); }}>Quitar</button>
          )}
        </div>
      </div>
    </div>
  );
}
