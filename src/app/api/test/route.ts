// ============================================================
// POST /api/test
// Verifica que la API Key del usuario funcione contra Gemini.
// Equivale a "🔌 Test conexión Gemini" del Apps Script.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GEMINI_MODELO } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let apiKey = "";
  try {
    const body = await req.json();
    apiKey = (body.apiKey || "").trim();
  } catch {
    /* body opcional */
  }
  apiKey = apiKey || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "Falta la API Key." }, { status: 401 });
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    GEMINI_MODELO +
    ":generateContent?key=" +
    apiKey;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Responde solo: OK" }] }] }),
    });
    const code = res.status;
    const text = await res.text();
    if (code !== 200) {
      return NextResponse.json(
        { ok: false, error: `Error [${code}]: ${text.substring(0, 200)}` },
        { status: code }
      );
    }
    const json = JSON.parse(text);
    const respuesta = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return NextResponse.json({ ok: true, modelo: GEMINI_MODELO, respuesta });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Error de red: " + (e as Error).message },
      { status: 502 }
    );
  }
}
