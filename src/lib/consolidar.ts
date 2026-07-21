// ============================================================
// Filtro por nombre + consolidación de resultados de la OC.
// Portado de filtrarPorNombre() y clasificarYExtraer() del script.
// ============================================================

import { FORCE_INCLUDE, SKIP_NOMBRES } from "./config";
import { deduplicarGastos } from "./parse";
import { DatosOC, DocItem, FACTURA_VACIA, Gasto } from "./types";

// Decide si un documento se salta por su nombre.
export function clasificarPorNombre(nombre: string): "force" | "skip" | "normal" {
  const nom = nombre.toLowerCase();
  const forzar = FORCE_INCLUDE.some((k) => nom.includes(k));
  if (forzar) return "force";
  const saltar = SKIP_NOMBRES.some((k) => nom.includes(k));
  return saltar ? "skip" : "normal";
}

// Consolida los ResultadoDoc de los documentos incluidos y procesados
// en un único DatosOC, aplicando las mismas reglas de aceptación del script.
export function consolidar(docs: DocItem[], nombreOC: string): DatosOC {
  const datos: DatosOC = {
    nombre_oc: nombreOC,
    factura: { ...FACTURA_VACIA },
    productos: [],
    dua: {},
    gastos: [],
    tc_eur: 0,
    tc_eur_gemini: 0,
    proyecto: "",
    periodo: new Date().getFullYear(),
    tipo_carga: "TOTAL",
    oc_titulo: "",
  };

  for (const doc of docs) {
    if (!doc.incluido || !doc.resultado) continue;
    const r = doc.resultado;

    switch (r.tipo) {
      case "FACTURA_COMERCIAL": {
        const nProds = r.productos?.length || 0;
        const nActual = datos.productos.length;
        const totalNuevo = r.total_exw || 0;
        const totalActual = datos.factura.total_exw || 0;
        // Acepta la factura si aporta más productos o mayor total EXW.
        if (nProds > nActual || totalNuevo > totalActual) {
          datos.factura = r.factura || { ...FACTURA_VACIA };
          datos.productos = r.productos || [];
          if (datos.factura.proyecto) datos.proyecto = datos.factura.proyecto;
        }
        break;
      }

      case "DUA": {
        if (!datos.dua.numero && r.dua?.numero) {
          datos.dua = r.dua;
          if ((r.dua.tc_eur || 0) > 0) datos.tc_eur_gemini = r.dua.tc_eur;
        }
        break;
      }

      case "GASTO": {
        // Gastos que vienen como documento (factura, nota). Incluidos por defecto.
        const docGastos = (r.gastos || []).map((g) => ({
          ...g,
          incluido: g.incluido !== false,
          origen: "documento" as const,
        }));
        datos.gastos = datos.gastos.concat(docGastos);
        break;
      }

      default:
        break;
    }
  }

  datos.gastos = deduplicarGastos(datos.gastos);

  // No perder los montos que Gemini extrajo de la DUA: se convierten en filas
  // de gasto (origen "dua"), a menos que ya exista un gasto equivalente por
  // documento. El costeador puede desmarcarlos si no aplican.
  datos.gastos = datos.gastos.concat(gastosDesdeDua(datos));

  // tc_eur editable arranca con lo detectado por Gemini.
  datos.tc_eur = datos.tc_eur_gemini;
  return datos;
}

// Deriva filas de gasto desde los campos de la DUA (flete, seguro, tributos),
// evitando duplicar un concepto que ya llegó como documento.
function gastosDesdeDua(datos: DatosOC): Gasto[] {
  const d = datos.dua || {};
  const existentes = datos.gastos.map((g) => (g.concepto || "").toUpperCase());
  const yaHay = (palabras: string[]) =>
    existentes.some((c) => palabras.some((p) => c.includes(p)));

  const candidatos: { monto: number; seccion: string; concepto: string; claves: string[] }[] = [
    { monto: d.flete_usd || 0, seccion: "AG. CARGA", concepto: "FLETE (DUA)", claves: ["FLETE"] },
    { monto: d.seguro_usd || 0, seccion: "AG. CARGA", concepto: "SEGURO (DUA)", claves: ["SEGURO"] },
    { monto: d.ad_valorem_usd || 0, seccion: "SUNAT", concepto: "AD-VALOREM", claves: ["AD-VALOREM", "AD VALOREM", "ADVALOREM"] },
    { monto: d.ipm_usd || 0, seccion: "SUNAT", concepto: "IPM", claves: ["IPM"] },
    { monto: d.igv_usd || 0, seccion: "SUNAT", concepto: "IGV", claves: ["IGV"] },
  ];

  const derivados: Gasto[] = [];
  for (const c of candidatos) {
    if (c.monto > 0 && !yaHay(c.claves)) {
      derivados.push({
        seccion: c.seccion,
        concepto: c.concepto,
        fecha: datos.dua.fecha || "",
        proveedor: "SUNAT / DUA " + (datos.dua.numero || ""),
        tipo_comprobante: "DUA",
        serie_numero: datos.dua.numero || "",
        moneda: "DÓLARES",
        monto: c.monto,
        incluido: true,
        origen: "dua",
      });
    }
  }
  return derivados;
}
