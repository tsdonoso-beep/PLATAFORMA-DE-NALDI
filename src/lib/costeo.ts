// ============================================================
// Cálculo del costeo — MISMA lógica que el Excel exportado
// (formato del área): todo gasto incluido se prorratea en $ por
// factor EXW; la conversión a soles es global con el TC USD.
// Así el preview en pantalla == el .xlsx exportado.
// ============================================================

import { DatosOC, Gasto } from "./types";

export interface GastoProrrateado {
  concepto: string;
  seccion: string;
  moneda: string;
  origen: "documento" | "dua";
  montoTotal: number;
  porProducto: number[]; // prorrateo por producto (en $)
}

export interface CosteoProducto {
  nombre: string;
  codigo: string;
  cantidad: number;
  factor: number;
  exw: number;
  totalGastosUSD: number;
  valorTotalUSD: number;
  valorTotalSoles: number;
  costoUnitUSD: number;
  costoUnitSoles: number;
  fi: number;
}

export interface CosteoResult {
  moneda: string;
  tcUsd: number;
  tcEur: number;
  totalEXW: number;
  productos: CosteoProducto[];
  gastos: GastoProrrateado[];
  totalGeneralUSD: number;
  totalGeneralSoles: number;
  totalGastosUSD: number;
}

// Solo cuentan los gastos marcados como incluidos.
export const gastoCuenta = (g: Gasto): boolean => g.incluido !== false;

export function calcularCosteo(datos: DatosOC): CosteoResult {
  const productos = datos.productos || [];
  const dua = datos.dua || {};
  const tcUsd = Number(dua.tc_usd) || 0;
  const tcEur = Number(datos.tc_eur) || 0;
  const moneda = datos.factura?.moneda || "USD";

  const totalEXW = productos.reduce((s, p) => s + (Number(p.exw_total) || 0), 0);
  const factor = (exw: number) => (totalEXW > 0 ? exw / totalEXW : 0);

  const gastosIncluidos = (datos.gastos || []).filter(gastoCuenta);

  const gastos: GastoProrrateado[] = gastosIncluidos.map((g) => ({
    concepto: g.concepto,
    seccion: g.seccion,
    moneda: g.moneda,
    origen: g.origen || "documento",
    montoTotal: Number(g.monto) || 0,
    porProducto: productos.map((p) => (Number(g.monto) || 0) * factor(Number(p.exw_total) || 0)),
  }));

  const cprods: CosteoProducto[] = productos.map((p, i) => {
    const exw = Number(p.exw_total) || 0;
    const fct = factor(exw);
    const totalGastosUSD = gastos.reduce((s, g) => s + g.porProducto[i], 0);
    const valorTotalUSD = exw + totalGastosUSD;
    // Conversión a soles global (igual que el bloque IMPORTACIONES del Excel).
    const valorTotalSoles = valorTotalUSD * tcUsd;
    const cantidad = Number(p.cantidad) || 0;
    const costoUnitUSD = cantidad > 0 ? valorTotalUSD / cantidad : 0;
    const costoUnitSoles = cantidad > 0 ? valorTotalSoles / cantidad : 0;
    const fi = exw > 0 ? valorTotalUSD / exw : 0;

    return {
      nombre: p.nombre,
      codigo: p.codigo,
      cantidad,
      factor: fct,
      exw,
      totalGastosUSD,
      valorTotalUSD,
      valorTotalSoles,
      costoUnitUSD,
      costoUnitSoles,
      fi,
    };
  });

  return {
    moneda,
    tcUsd,
    tcEur,
    totalEXW,
    productos: cprods,
    gastos,
    totalGeneralUSD: cprods.reduce((s, p) => s + p.valorTotalUSD, 0),
    totalGeneralSoles: cprods.reduce((s, p) => s + p.valorTotalSoles, 0),
    totalGastosUSD: cprods.reduce((s, p) => s + p.totalGastosUSD, 0),
  };
}
