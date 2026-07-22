"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import UploadZone from "@/components/UploadZone";
import ExtraccionEditor from "@/components/ExtraccionEditor";
import CosteoView from "@/components/CosteoView";
import ApiKeyConfig from "@/components/ApiKeyConfig";
import { getApiKey } from "@/lib/apikey";
import { PAUSA_MS } from "@/lib/config";
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
  // Cancelación del procesamiento.
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setApiKeyState(getApiKey()), []);

  // Sleep interrumpible: se corta apenas se pide cancelar.
  const pausa = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setInterval(() => {
        if (cancelRef.current) {
          clearInterval(t);
          resolve();
        }
      }, 150);
      setTimeout(() => {
        clearInterval(t);
        resolve();
      }, ms);
    });

  function cancelar() {
    cancelRef.current = true;
    abortRef.current?.abort();
  }

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
    cancelRef.current = false;
    setFase("procesando");
    setProgreso({ hecho: 0, total: aProcesar.length, actual: "" });

    const actualizados = [...docs];
    let cancelado = false;
    for (let i = 0; i < aProcesar.length; i++) {
      if (cancelRef.current) { cancelado = true; break; }
      const doc = aProcesar[i];
      setProgreso({ hecho: i, total: aProcesar.length, actual: doc.nombre });

      // Pausa anti-429 entre documentos (interrumpible), no antes del primero.
      if (i > 0) {
        await pausa(PAUSA_MS);
        if (cancelRef.current) { cancelado = true; break; }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
          actualizados[idx] = { ...doc, procesado: true, resultado: json.resultado, raw: json.raw };
        }
        setDocs([...actualizados]);
      } catch (e) {
        if ((e as Error).name === "AbortError" || cancelRef.current) { cancelado = true; break; }
        const idx = actualizados.findIndex((d) => d.id === doc.id);
        actualizados[idx] = { ...doc, procesado: true, error: (e as Error).message };
        setDocs([...actualizados]);
      }
    }
    abortRef.current = null;

    const nombre = nombreOC.trim() || "OC";
    const algunoProcesado = actualizados.some((d) => d.procesado);
    if (cancelado && !algunoProcesado) {
      // Nada alcanzó a procesarse: vuelve a la carga.
      setFase("carga");
      return;
    }
    // Consolida lo procesado (parcial si se canceló) y muestra resultados.
    setDatos(consolidar(actualizados, nombre));
    setFase("resultado");
  }

  function reiniciar() {
    setDocs([]);
    setDatos(null);
    setFase("carga");
    setNombreOC("");
  }

  const pasoActual = fase === "carga" ? 1 : fase === "procesando" ? 2 : 3;
  const fmtMoney = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen">
      {/* ---------- BARRA SUPERIOR ---------- */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/inroprin-logo.svg" alt="INROPRIN — Industrias Roland Print" className="h-10 w-10" />
            <div className="leading-tight">
              <div className="font-display text-[17px] font-bold tracking-tight text-[var(--ink)]">
                INROPRIN
              </div>
              <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">
                Costeo de Importaciones
              </div>
            </div>
          </div>
          <ApiKeyConfig onChange={setApiKeyState} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* ---------- STEPPER ---------- */}
        <Stepper paso={pasoActual} />

        {/* ---------- FASE CARGA ---------- */}
        {fase === "carga" && (
          <div className="space-y-6 rise">
            <section className="card p-5">
              <label className="mb-1.5 block text-sm font-medium text-[var(--ink-2)]">
                Nombre / N° de la OC
              </label>
              <input
                className="w-full max-w-md rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 font-mono-num outline-none focus:border-[var(--accent)]"
                placeholder="Ej: OC-2025-0142"
                value={nombreOC}
                onChange={(e) => setNombreOC(e.target.value)}
              />
            </section>

            <UploadZone onAdd={(nuevos) => setDocs((d) => [...d, ...nuevos])} />

            {docs.length > 0 && (
              <section className="card p-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-[var(--ink)]">Documentos</h2>
                  <span className="text-sm text-[var(--ink-soft)]">
                    <b className="font-mono-num text-[var(--ink)]">{incluidos.length}</b> de{" "}
                    <span className="font-mono-num">{docs.length}</span> se procesarán
                  </span>
                </div>
                <ul className="divide-y divide-[var(--line)]">
                  {docs.map((d) => (
                    <li key={d.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        className="accent-[var(--accent)]"
                        checked={d.incluido}
                        onChange={() => toggleIncluir(d.id)}
                      />
                      <span className="flex-1 truncate text-sm text-[var(--ink-2)]">
                        {d.nombre}{" "}
                        <span className="font-mono-num text-[var(--ink-soft)]">· {d.tamanoKB} KB</span>
                        {d.motivoFiltro === "skip" && (
                          <span className="chip ml-2 bg-[var(--paper-2)] text-[var(--ink-soft)]">
                            saltado por nombre
                          </span>
                        )}
                        {d.motivoFiltro === "force" && (
                          <span className="chip ml-2 bg-[var(--accent-soft)] text-[var(--accent)]">
                            relevante
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => quitar(d.id)}
                        className="text-sm text-[var(--ink-soft)] hover:text-[var(--bad)]"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={procesar} disabled={incluidos.length === 0} className="btn btn-primary">
                    Procesar {incluidos.length} documento(s) con Gemini
                  </button>
                  <button onClick={reiniciar} className="btn btn-ghost">
                    Limpiar
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ---------- FASE PROCESANDO ---------- */}
        {fase === "procesando" && (
          <section className="card p-6 rise">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-semibold text-[var(--ink)]">
                  Procesando {Math.min(progreso.hecho + 1, progreso.total)} de {progreso.total}
                </p>
                <p className="mt-1 truncate text-sm text-[var(--ink-soft)]">{progreso.actual}</p>
              </div>
              <button
                onClick={cancelar}
                className="btn shrink-0 border border-[var(--bad)]/40 bg-[var(--bad)]/5 text-[var(--bad)]"
              >
                ✕ Cancelar
              </button>
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--paper-2)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${(progreso.hecho / progreso.total) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              Pausa de {(PAUSA_MS / 1000).toFixed(1)}s entre documentos para no saturar el límite de Gemini.
              Puedes cancelar en cualquier momento.
            </p>
          </section>
        )}

        {/* ---------- FASE RESULTADO ---------- */}
        {fase === "resultado" && datos && costeo && (
          <div className="space-y-6 rise">
            {/* Resumen del costeo */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <SummaryTile label="Valor total $" value={fmtMoney(costeo.totalGeneralUSD)} accent />
              <SummaryTile label="Valor total S/" value={fmtMoney(costeo.totalGeneralSoles)} />
              <SummaryTile label="Total gastos $" value={fmtMoney(costeo.totalGastosUSD)} />
              <SummaryTile
                label="Productos · gastos"
                value={`${costeo.productos.length} · ${costeo.gastos.length}`}
              />
            </section>

            {/* Clasificación */}
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-semibold text-[var(--ink)]">Clasificación de documentos</h2>
              <ul className="space-y-1.5 text-sm">
                {docs.filter((d) => d.procesado).map((d) => (
                  <li key={d.id} className="flex items-center gap-3">
                    <span className="chip w-32 shrink-0 justify-center bg-[var(--paper-2)] text-[var(--ink-2)]">
                      {d.error ? "⚠ Error" : TIPO_LABEL[d.resultado?.tipo || "IRRELEVANTE"]}
                    </span>
                    <span className="flex-1 truncate text-[var(--ink-2)]">{d.nombre}</span>
                    {d.error && <span className="text-xs text-[var(--bad)]">{d.error}</span>}
                  </li>
                ))}
              </ul>
            </section>

            {/* Editor */}
            <section className="card p-5">
              <h2 className="mb-4 text-lg font-semibold text-[var(--ink)]">Extracción (editable)</h2>
              <ExtraccionEditor datos={datos} onChange={setDatos} />
            </section>

            {/* Costeo */}
            <section className="card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[var(--ink)]">Formato de costeo (dólar)</h2>
                <div className="flex gap-2">
                  <button onClick={() => exportarExcel(datos)} className="btn btn-accent">
                    ⬇ Exportar Excel
                  </button>
                  <button onClick={reiniciar} className="btn btn-ghost">
                    Nueva OC
                  </button>
                </div>
              </div>
              <CosteoView costeo={costeo} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

// ---- Stepper de fases ----
function Stepper({ paso }: { paso: number }) {
  const pasos = ["Cargar", "Procesar", "Revisar y costear"];
  return (
    <ol className="mb-7 flex items-center gap-2 text-sm">
      {pasos.map((label, i) => {
        const n = i + 1;
        const activo = n === paso;
        const hecho = n < paso;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full font-mono-num text-xs font-semibold ${
                activo
                  ? "bg-[var(--ink)] text-white"
                  : hecho
                  ? "bg-[var(--ok)] text-white"
                  : "bg-[var(--paper-2)] text-[var(--ink-soft)]"
              }`}
            >
              {hecho ? "✓" : n}
            </span>
            <span className={activo ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-soft)]"}>
              {label}
            </span>
            {n < pasos.length && <span className="mx-1 h-px w-8 bg-[var(--line-strong)]" />}
          </li>
        );
      })}
    </ol>
  );
}

// ---- Tarjeta de resumen ----
function SummaryTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "ring-1 ring-[var(--accent)]/30" : ""}`}>
      <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div
        className={`font-mono-num mt-1 text-xl font-semibold ${
          accent ? "text-[var(--accent)]" : "text-[var(--ink)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
