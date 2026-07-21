// ============================================================
// Cálculo del costeo — prorrateo por factor EXW.
// Portado de generarCosteo() del Apps Script (que lo hacía con
// fórmulas de Sheets). Aquí se computa en JS para la tabla viva.
// ============================================================

import { DatosOC, Gasto } from "./types";

export interface GastoProrrateado {
  concepto: string;
  seccion: string;
  moneda: string;
  esSoles: boolean;
  montoTotal: number;
  porProducto: number[]; // prorrateo por producto (en su moneda)
}

export interface CosteoProducto {
  nombre: string;
  codigo: string;
  cantidad: number;
  factor: number;
  exw: number;
  flete: number;
  seguro: number;
  cif: number;
  totalGastosUSD: number;
  totalGastosSoles: number;
  valorTotalUSD: number;
  valorTotalSoles: number;
  costoUnitUSD: number;
  costoUnitSoles: number;
  fi: number;
  advalorem: number;
  ipm: number;
  igv: number;
}

export interface CosteoResult {
  moneda: string;
  tcUsd: number;
  tcEur: number;
  totalEXW: number;
  productos: CosteoProducto[];
  gastos: GastoProrrateado[];
  // Totales generales (fila TOTAL del costeo)
  totalGeneralUSD: number;
  totalGeneralSoles: number;
}

const esGastoSoles = (g: Gasto): boolean =>
  (g.moneda || "").toUpperCase().includes("SOL");

export function calcularCosteo(datos: DatosOC): CosteoResult {
  const productos = datos.productos || [];
  const dua = datos.dua || {};
  const tcUsd = Number(dua.tc_usd) || 0;
  const tcEur = Number(datos.tc_eur) || 0;
  const moneda = datos.factura?.moneda || "USD";

  const totalEXW = productos.reduce((s, p) => s + (Number(p.exw_total) || 0), 0);
  const factor = (exw: number) => (totalEXW > 0 ? exw / totalEXW : 0);

  const fleteDua = Number(dua.flete_usd) || 0;
  const seguroDua = Number(dua.seguro_usd) || 0;
  const advaloremDua = Number(dua.ad_valorem_usd) || 0;
  const ipmDua = Number(dua.ipm_usd) || 0;
  const igvDua = Number(dua.igv_usd) || 0;

  // Prorrateo de cada gasto por producto.
  const gastos: GastoProrrateado[] = (datos.gastos || []).map((g) => {
    const esSoles = esGastoSoles(g);
    return {
      concepto: g.concepto,
      seccion: g.seccion,
      moneda: g.moneda,
      esSoles,
      montoTotal: Number(g.monto) || 0,
      porProducto: productos.map((p) => (Number(g.monto) || 0) * factor(Number(p.exw_total) || 0)),
    };
  });

  const cprods: CosteoProducto[] = productos.map((p, i) => {
    const exw = Number(p.exw_total) || 0;
    const fct = factor(exw);
    const flete = fleteDua * fct;
    const seguro = seguroDua * fct;
    const cif = exw + flete + seguro;

    let totalGastosUSD = 0;
    let totalGastosSoles = 0;
    for (const g of gastos) {
      if (g.esSoles) totalGastosSoles += g.porProducto[i];
      else totalGastosUSD += g.porProducto[i];
    }

    const valorTotalUSD = exw + totalGastosUSD;
    const valorTotalSoles =
      Math.round((valorTotalUSD * tcUsd + totalGastosSoles) * 100) / 100;

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
      flete,
      seguro,
      cif,
      totalGastosUSD,
      totalGastosSoles,
      valorTotalUSD,
      valorTotalSoles,
      costoUnitUSD,
      costoUnitSoles,
      fi,
      advalorem: advaloremDua * fct,
      ipm: ipmDua * fct,
      igv: igvDua * fct,
    };
  });

  const totalGeneralUSD = cprods.reduce((s, p) => s + p.valorTotalUSD, 0);
  const totalGeneralSoles = cprods.reduce((s, p) => s + p.valorTotalSoles, 0);

  return {
    moneda,
    tcUsd,
    tcEur,
    totalEXW,
    productos: cprods,
    gastos,
    totalGeneralUSD,
    totalGeneralSoles,
  };
}
