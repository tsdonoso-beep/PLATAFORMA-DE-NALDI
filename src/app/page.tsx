"use client";

import { useEffect, useMemo, useState } from "react";
import UploadZone from "@/components/UploadZone";
import ExtraccionEditor from "@/components/ExtraccionEditor";
import CosteoView from "@/components/CosteoView";
import ApiKeyConfig from "@/components/ApiKeyConfig";
import { getApiKey } from "@/lib/apikey";
import { consolidar } from "@/lib/consolidar";
import { calcularCosteo } from "@/lib/costeo";
import { exportarExcel } from "@/lib/excel";
import { DatosOC, DocItem } from "@/lib/types";

type Fase = "carga" | "procesando" | "resultado";

const TIPO_LABEL: Record<string, string> = {
  FACTURA_COMERCIAL: "🧾 Factura",
  DUA: "📋 DUA",
  GASTO: "💰 Gasto",
  IRRELEVANTE: "⏭ Irrelevante",
};

export default function Home() {
  const [nombreOC, setNombreOC] = useState("");
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [fase, setFase] = useState<Fase>("carga");
  const [datos, setDatos] = useState<DatosOC | null>(null);
  const [progreso, setProgreso] = useState({ hecho: 0, total: 0, actual: "" });
  const [apiKey, setApiKeyState] = useState("");

  useEffect(() => setApiKeyState(getApiKey()), []);

  const costeo = useMemo(() => (datos ? calcularCosteo(datos) : null), [datos]);
  const incluidos = docs.filter((d) => d.incluido);

  const toggleIncluir = (id: string) =>
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, incluido: !d.incluido } : d)));

  const quitar = (id: string) => setDocs((ds) => ds.filter((d) => d.id !== id));

  async function procesar() {
    const aProcesar = docs.filter((d) => d.incluido);
    if (aProcesar.length === 0) return;
    if (!apiKey) {
      alert("Primero configura tu Gemini API Key (botón ⚙ API Key arriba a la derecha).");
      return;
    }
    setFase("procesando");
    setProgreso({ hecho: 0, total: aProcesar.length, actual: "" });

    const actualizados = [...docs];
    for (let i = 0; i < aProcesar.length; i++) {
      const doc = aProcesar[i];
      setProgreso({ hecho: i, total: aProcesar.length, actual: doc.nombre });
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: doc.nombre,
            base64: doc.base64,
            mimeType: doc.mimeType,
            apiKey,
          }),
        });
        const json = await res.json();
        const idx = actualizados.findIndex((d) => d.id === doc.id);
        if (!res.ok) {
          actualizados[idx] = { ...doc, procesado: true, error: json.error || "Error" };
        } else {
          actualizados[idx] = {
            ...doc,
            procesado: true,
            resultado: json.resultado,
            raw: json.raw,
          };
        }
        setDocs([...actualizados]);
      } catch (e) {
        const idx = actualizados.findIndex((d) => d.id === doc.id);
        actualizados[idx] = { ...doc, procesado: true, error: (e as Error).message };
        setDocs([...actualizados]);
      }
    }

    const nombre = nombreOC.trim() || "OC";
    setDatos(consolidar(actualizados, nombre));
    setFase("resultado");
  }

  function reiniciar() {
    setDocs([]);
    setDatos(null);
    setFase("carga");
    setNombreOC("");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Extractor de Costeo de Importaciones
          </h1>
          <p className="text-sm text-slate-500">
            Sube los documentos de la OC → Gemini los clasifica y extrae → corriges → exportas el costeo.
          </p>
        </div>
        <ApiKeyConfig onChange={setApiKeyState} />
      </header>

      {/* ---------- FASE CARGA ---------- */}
      {fase === "carga" && (
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Nombre / N° de la OC
            </label>
            <input
              className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2"
              placeholder="Ej: OC-2025-0142"
              value={nombreOC}
              onChange={(e) => setNombreOC(e.target.value)}
            />
          </div>

          <UploadZone onAdd={(nuevos) => setDocs((d) => [...d, ...nuevos])} />

          {docs.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">
                Documentos ({incluidos.length} de {docs.length} se procesarán)
              </h2>
              <ul className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={d.incluido}
                      onChange={() => toggleIncluir(d.id)}
                    />
                    <span className="flex-1 text-sm">
                      {d.nombre}{" "}
                      <span className="text-slate-400">({d.tamanoKB} KB)</span>
                      {d.motivoFiltro === "skip" && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                          saltado por nombre
                        </span>
                      )}
                      {d.motivoFiltro === "force" && (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                          incluido
                        </span>
                      )}
                    </span>
                    <button onClick={() => quitar(d.id)} className="text-sm text-red-500">
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={procesar}
                  disabled={incluidos.length === 0}
                  className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
                >
                  Procesar {incluidos.length} documento(s) con Gemini
                </button>
                <button onClick={reiniciar} className="rounded-md border px-4 py-2 text-slate-600">
                  Limpiar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- FASE PROCESANDO ---------- */}
      {fase === "procesando" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="font-medium text-slate-700">
            🤖 Procesando {progreso.hecho + 1} de {progreso.total}…
          </p>
          <p className="mt-1 text-sm text-slate-500">{progreso.actual}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded bg-slate-100">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${(progreso.hecho / progreso.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ---------- FASE RESULTADO ---------- */}
      {fase === "resultado" && datos && costeo && (
        <div className="space-y-8">
          {/* Log de clasificación */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-700">Clasificación de documentos</h2>
            <ul className="space-y-1 text-sm">
              {docs.filter((d) => d.procesado).map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <span className="w-28 shrink-0">
                    {d.error ? "⚠ Error" : TIPO_LABEL[d.resultado?.tipo || "IRRELEVANTE"]}
                  </span>
                  <span className="flex-1 truncate">{d.nombre}</span>
                  {d.error && <span className="text-xs text-red-500">{d.error}</span>}
                </li>
              ))}
            </ul>
          </section>

          {/* Editor de extracción */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold text-slate-700">Extracción (editable)</h2>
            <ExtraccionEditor datos={datos} onChange={setDatos} />
          </section>

          {/* Costeo */}
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Formato de costeo (dólar)</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => exportarExcel(datos, costeo)}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white"
                >
                  ⬇ Exportar Excel
                </button>
                <button onClick={reiniciar} className="rounded-md border px-4 py-2 text-sm text-slate-600">
                  Nueva OC
                </button>
              </div>
            </div>
            <CosteoView costeo={costeo} />
          </section>
        </div>
      )}
    </main>
  );
}
