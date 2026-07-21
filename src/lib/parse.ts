// ============================================================
// Parsers — portados del Apps Script.
// Normalizan la respuesta cruda de Gemini a ResultadoDoc.
// ============================================================

import { Confianza, Gasto, ResultadoDoc } from "./types";

const normConfianza = (v: unknown): Confianza => {
  const s = String(v || "").toLowerCase();
  return s === "media" || s === "baja" ? (s as Confianza) : "alta";
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
};

const int = (v: unknown): number => {
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : n;
};

export function limpiarJSON(texto: string): string {
  let s = texto.trim();
  const match = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  s = s.replace(/```json/gi, "").replace(/```/gi, "");
  return s.trim();
}

export function parsearRespuestaMaestra(texto: string): ResultadoDoc {
  try {
    const obj = JSON.parse(limpiarJSON(texto));
    const tipo = obj.tipo || "IRRELEVANTE";

    switch (tipo) {
      case "FACTURA_COMERCIAL": {
        const f = obj.factura || {};
        return {
          tipo,
          factura: {
            proveedor: f.proveedor || "",
            pais_proveedor: f.pais_proveedor || "",
            numero_factura: f.numero_factura || "",
            fecha_factura: f.fecha_factura || "",
            incoterm: f.incoterm || "EXW",
            moneda: f.moneda || "USD",
            numero_oc: f.numero_oc || "",
            proyecto: f.proyecto || "",
            descuento_porcentaje: num(f.descuento_porcentaje),
            total_exw: num(f.total_exw),
            notas: f.notas || "",
          },
          productos: (obj.productos || []).map((p: Record<string, unknown>) => ({
            nombre: (p.nombre as string) || "",
            codigo: (p.codigo as string) || "",
            cantidad: int(p.cantidad),
            precio_unit: num(p.precio_unitario),
            exw_total: num(p.exw_total),
            partida: (p.partida as string) || "",
            peso: p.peso !== undefined && p.peso !== null ? String(p.peso) : "",
            confianza: normConfianza(p.confianza),
          })),
          total_exw: num(obj.total_exw) || num(f.total_exw),
        };
      }

      case "DUA": {
        const d = obj.dua || {};
        return {
          tipo,
          dua: {
            numero: d.numero || "",
            fecha: d.fecha || "",
            tc_usd: num(d.tc_usd),
            tc_eur: num(d.tc_eur),
            fob_usd: num(d.fob_usd),
            flete_usd: num(d.flete_usd),
            seguro_usd: num(d.seguro_usd),
            cif_usd: num(d.cif_usd),
            ad_valorem_usd: num(d.ad_valorem_usd),
            ipm_usd: num(d.ipm_usd),
            igv_usd: num(d.igv_usd),
            total_tributos_usd: num(d.total_tributos_usd),
          },
        };
      }

      case "GASTO": {
        return {
          tipo,
          gastos: (obj.gastos || []).map((g: Record<string, unknown>) => ({
            seccion: (g.seccion as string) || "",
            concepto: (g.concepto as string) || "",
            fecha: (g.fecha as string) || "",
            proveedor: (g.proveedor as string) || "",
            tipo_comprobante: (g.tipo_comprobante as string) || "FACTURA",
            serie_numero: (g.serie_numero as string) || "",
            moneda: (g.moneda as string) || "DÓLARES",
            monto: num(g.monto),
            igv: num(g.igv),
            confianza: normConfianza(g.confianza),
          })),
        };
      }

      default:
        return { tipo: "IRRELEVANTE" };
    }
  } catch {
    return { tipo: "IRRELEVANTE" };
  }
}

export function deduplicarGastos(gastos: Gasto[]): Gasto[] {
  const vistos = new Set<string>();
  return gastos.filter((g) => {
    if (!g.serie_numero || g.serie_numero === "0" || g.serie_numero === "N/A") return true;
    const clave =
      g.serie_numero.trim().toUpperCase() + "|" + g.concepto.trim().toUpperCase();
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}
