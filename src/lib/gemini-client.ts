// ============================================================
// Cliente de Gemini que corre EN EL NAVEGADOR (sin servidor).
// Cada usuario usa su propia API Key. Esto permite exportar la
// app como estática y alojarla en GitHub Pages.
// ============================================================

import { GEMINI_MODELO } from "./config";
import { promptMaestro } from "./prompt";
import { parsearRespuestaMaestra } from "./parse";
import { ResultadoDoc } from "./types";

const endpoint = (modelo: string, apiKey: string) =>
  "https://generativelanguage.googleapis.com/v1beta/models/" +
  modelo +
  ":generateContent?key=" +
  encodeURIComponent(apiKey);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ExtraccionResp {
  resultado: ResultadoDoc;
  raw: string;
}

// Extrae y clasifica un documento (PDF o imagen) llamando a Gemini.
export async function extraerDocumento(
  nombre: string,
  base64: string,
  mimeType: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<ExtraccionResp> {
  if (!apiKey) throw new Error("Falta la API Key.");

  const payload = {
    contents: [
      {
        parts: [
          { text: promptMaestro() },
          { text: `\n\n=== DOCUMENTO: ${nombre} ===` },
          { inlineData: { mimeType: mimeType || "application/pdf", data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };

  const url = endpoint(GEMINI_MODELO, apiKey);

  // Reintentos ante 429/503 (API saturada).
  let intentos = 0;
  let respText = "";
  while (intentos < 3) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
    const code = res.status;
    const text = await res.text();

    if (code === 429 || code === 503) {
      intentos++;
      if (intentos >= 3) throw new Error(`Error ${code}: API saturada. Espera y reintenta.`);
      await sleep(8000);
      continue;
    }
    if (code !== 200) {
      throw new Error(`Gemini [${code}]: ${text.substring(0, 300)}`);
    }
    try {
      const json = JSON.parse(text);
      respText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
      respText = "";
    }
    break;
  }

  return { resultado: parsearRespuestaMaestra(respText), raw: respText };
}

// Prueba de conexión (equivale al viejo /api/test).
export async function testConexion(
  apiKey: string
): Promise<{ ok: boolean; modelo?: string; respuesta?: string; error?: string }> {
  if (!apiKey) return { ok: false, error: "Falta la API Key." };
  try {
    const res = await fetch(endpoint(GEMINI_MODELO, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Responde solo: OK" }] }] }),
    });
    const code = res.status;
    const text = await res.text();
    if (code !== 200) return { ok: false, error: `Error [${code}]: ${text.substring(0, 200)}` };
    const json = JSON.parse(text);
    return {
      ok: true,
      modelo: GEMINI_MODELO,
      respuesta: json?.candidates?.[0]?.content?.parts?.[0]?.text || "",
    };
  } catch (e) {
    return { ok: false, error: "Error de red: " + (e as Error).message };
  }
}
