"use client";

import { useCallback, useRef, useState } from "react";
import { clasificarPorNombre } from "@/lib/consolidar";
import { fileToBase64, uid } from "@/lib/client";
import { DocItem } from "@/lib/types";

export default function UploadZone({ onAdd }: { onAdd: (docs: DocItem[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const procesar = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
      );
      const docs: DocItem[] = [];
      for (const f of arr) {
        const base64 = await fileToBase64(f);
        const motivo = clasificarPorNombre(f.name);
        docs.push({
          id: uid(),
          nombre: f.name,
          tamanoKB: Math.round(f.size / 1024),
          base64,
          mimeType: "application/pdf",
          incluido: motivo !== "skip",
          motivoFiltro: motivo,
        });
      }
      if (docs.length) onAdd(docs);
    },
    [onAdd]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        procesar(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition ${
        dragOver
          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
          : "border-[var(--line-strong)] bg-white/60 hover:bg-white"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && procesar(e.target.files)}
      />
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--paper-2)] text-2xl">
        📄
      </div>
      <p className="mt-3 font-display text-lg font-semibold text-[var(--ink)]">
        Arrastra los PDFs de la OC aquí
      </p>
      <p className="mt-0.5 text-sm text-[var(--ink-soft)]">o haz clic para seleccionar archivos</p>
    </div>
  );
}
