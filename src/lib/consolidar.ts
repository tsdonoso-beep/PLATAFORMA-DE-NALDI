// ============================================================
// Filtro por nombre + consolidación de resultados de la OC.
// Portado de filtrarPorNombre() y clasificarYExtraer() del script.
// ============================================================

import { FORCE_INCLUDE, SKIP_NOMBRES } from "./config";
import { deduplicarGastos } from "./parse";
import { DatosOC, DocItem, FACTURA_VACIA } from "./types";

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
        datos.gastos = datos.gastos.concat(r.gastos || []);
        break;
      }

      default:
        break;
    }
  }

  datos.gastos = deduplicarGastos(datos.gastos);
  // tc_eur editable arranca con lo detectado por Gemini.
  datos.tc_eur = datos.tc_eur_gemini;
  return datos;
}
