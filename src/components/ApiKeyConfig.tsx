"use client";

import { useEffect, useState } from "react";
import {
  clearApiKey,
  getApiKey,
  maskApiKey,
  pareceKeyValida,
  setApiKey,
} from "@/lib/apikey";

export default function ApiKeyConfig({ onChange }: { onChange?: (key: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [keyGuardada, setKeyGuardada] = useState("");
  const [input, setInput] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [probando, setProbando] = useState(false);

  useEffect(() => {
    const k = getApiKey();
    setKeyGuardada(k);
    setInput(k);
  }, []);

  const guardar = () => {
    const val = input.trim();
    if (!val) return;
    if (!pareceKeyValida(val) && !confirm("La key no empieza con 'AIza'. ¿Guardar igual?")) return;
    setApiKey(val);
    setKeyGuardada(val);
    setTestMsg(null);
    onChange?.(val);
  };

  const borrar = () => {
    clearApiKey();
    setKeyGuardada("");
    setInput("");
    setTestMsg(null);
    onChange?.("");
  };

  const probar = async () => {
    setProbando(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: input.trim() }),
      });
      const json = await res.json();
      setTestMsg(
        json.ok
          ? { ok: true, texto: "✅ Conexión OK — " + json.modelo }
          : { ok: false, texto: "❌ " + (json.error || "Error") }
      );
    } catch (e) {
      setTestMsg({ ok: false, texto: "❌ " + (e as Error).message });
    } finally {
      setProbando(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className={`rounded-lg border px-3 py-1.5 text-sm transition ${
          keyGuardada
            ? "border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--brand)]/40 bg-[var(--brand)]/10 text-[var(--brand)]"
        }`}
      >
        ⚙ API Key {keyGuardada ? `· ${maskApiKey(keyGuardada)}` : "· sin configurar"}
      </button>

      {abierto && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <h3 className="mb-1 font-semibold text-slate-700">Configurar Gemini API Key</h3>
          <p className="mb-3 text-xs text-slate-500">
            Cada persona usa su propia key para consumir su propio límite (RPM/RPD). Se
            guarda solo en este navegador. Consíguela en aistudio.google.com → Get API key.
          </p>
          <input
            type="password"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            placeholder="AIza..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={guardar} className="rounded-lg bg-[var(--ink)] px-3 py-1.5 text-sm text-white">
              Guardar
            </button>
            <button
              onClick={probar}
              disabled={probando || !input.trim()}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 disabled:opacity-40"
            >
              {probando ? "Probando…" : "🔌 Test conexión"}
            </button>
            {keyGuardada && (
              <button onClick={borrar} className="rounded px-3 py-1.5 text-sm text-red-500">
                Borrar
              </button>
            )}
          </div>
          {testMsg && (
            <p className={`mt-2 text-xs ${testMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {testMsg.texto}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
