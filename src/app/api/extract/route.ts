// ============================================================
// POST /api/extract
// Recibe 1 PDF (base64) y lo manda a Gemini con el prompt maestro.
// La API key vive SOLO en el servidor (env GEMINI_API_KEY).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODELO } from "@/lib/config";
import { promptMaestro } from "@/lib/prompt";
import { parsearRespuestaMaestra } from "@/lib/parse";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  nombre: string;
  base64: string;
  mimeType?: string;
  apiKey?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  // La key la trae cada usuario (su propio RPM/RPD). El env solo es respaldo dev.
  const apiKey = (body.apiKey || "").trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta la API Key. Configúrala con '⚙ Configurar API Key'." },
      { status: 401 }
    );
  }

  if (!body.base64) {
    return NextResponse.json({ error: "Falta el PDF." }, { status: 400 });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODELO +
    ":generateContent?key=" +
    apiKey;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptMaestro() },
          { text: `\n\n=== DOCUMENTO: ${body.nombre} ===` },
          {
            inlineData: {
              mimeType: body.mimeType || "application/pdf",
              data: body.base64,
            },
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };

  // Reintentos ante 429/503 (API saturada), como en el script.
  let intentos = 0;
  let respText = "";
  while (intentos < 3) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Error de red al llamar Gemini: " + (e as Error).message },
        { status: 502 }
      );
    }

    const code = res.status;
    const text = await res.text();

    if (code === 429 || code === 503) {
      intentos++;
      if (intentos >= 3) {
        return NextResponse.json(
          { error: `Error ${code}: API saturada. Espera y reintenta.` },
          { status: code }
        );
      }
      await new Promise((r) => setTimeout(r, 8000));
      continue;
    }

    if (code !== 200) {
      return NextResponse.json(
        { error: `Gemini [${code}]: ${text.substring(0, 300)}` },
        { status: code }
      );
    }

    try {
      const json = JSON.parse(text);
      respText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
      respText = "";
    }
    break;
  }

  const resultado = parsearRespuestaMaestra(respText);
  return NextResponse.json({ resultado, raw: respText });
}
