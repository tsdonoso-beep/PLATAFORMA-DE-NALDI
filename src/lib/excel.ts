// ============================================================
// Exportación a .xlsx con ExcelJS (se ejecuta en el cliente).
// Replica las hojas EXTRACCION y FORMATO DE COSTEO DOLAR.
// ============================================================

import type { Workbook, Worksheet } from "exceljs";
import { COLOR, EMPRESA } from "./config";
import { CosteoResult } from "./costeo";
import { DatosOC } from "./types";

const fill = (hex: string) => ({
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF" + hex },
});

function estiloHeader(ws: Worksheet, celda: string, bg: string, fc = "FFFFFF") {
  const c = ws.getCell(celda);
  c.fill = fill(bg);
  c.font = { bold: true, color: { argb: "FF" + fc } };
}

// ---------- Hoja EXTRACCION ----------
function hojaExtraccion(ws: Worksheet, datos: DatosOC) {
  const f = datos.factura;
  const d = datos.dua;

  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 12;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 10;
  ws.getColumn(8).width = 12;

  let r = 1;
  ws.mergeCells(r, 1, r, 8);
  ws.getCell(r, 1).value = "EXTRACCION — " + (datos.nombre_oc || "");
  estiloHeader(ws, "A" + r, COLOR.AZUL_OSCURO);
  r += 2;

  ws.getCell(r, 1).value = "DATOS GENERALES";
  estiloHeader(ws, "A" + r, "1565C0");
  r++;

  const generales: [string, string | number][] = [
    ["TC USD (soles/dólar)", d.tc_usd || ""],
    ["TC EUR (soles/euro)", datos.tc_eur || ""],
    ["DUA / Ref. Courier", d.numero || ""],
    ["Fecha DUA", d.fecha || ""],
    ["Proveedor", f.proveedor || ""],
    ["N° Factura(s)", f.numero_factura || ""],
    ["Fecha Factura", f.fecha_factura || ""],
    ["Moneda Factura", f.moneda || "USD"],
    ["N° Orden de Compra", f.numero_oc || datos.nombre_oc || ""],
    ["Descuento %", f.descuento_porcentaje || 0],
    ["FOB USD", d.fob_usd || 0],
    ["Flete USD (DUA)", d.flete_usd || 0],
    ["Seguro USD", d.seguro_usd || 0],
    ["CIF USD", d.cif_usd || 0],
  ];
  for (const [etiq, val] of generales) {
    ws.getCell(r, 1).value = etiq;
    ws.getCell(r, 1).fill = fill(COLOR.AZUL_SUB);
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = val;
    ws.getCell(r, 2).fill = fill(COLOR.AMARILLO_EDIT);
    r++;
  }
  r++;

  ws.getCell(r, 1).value = "PRODUCTOS";
  estiloHeader(ws, "A" + r, "1565C0");
  r++;
  ["NOMBRE", "CÓDIGO", "CANTIDAD", "PRECIO UNIT.", "EXW TOTAL", "MONEDA"].forEach((h, i) => {
    ws.getCell(r, i + 1).value = h;
    ws.getCell(r, i + 1).fill = fill(COLOR.AZUL_SUB);
    ws.getCell(r, i + 1).font = { bold: true };
  });
  r++;
  for (const p of datos.productos) {
    ws.getCell(r, 1).value = p.nombre;
    ws.getCell(r, 2).value = p.codigo;
    ws.getCell(r, 3).value = p.cantidad;
    ws.getCell(r, 4).value = p.precio_unit;
    ws.getCell(r, 5).value = p.exw_total;
    ws.getCell(r, 6).value = datos.factura.moneda || "USD";
    for (let c = 1; c <= 6; c++) ws.getCell(r, c).fill = fill(COLOR.AMARILLO_EDIT);
    r++;
  }
  r += 2;

  ws.getCell(r, 1).value = "GASTOS DE IMPORTACIÓN";
  estiloHeader(ws, "A" + r, "1565C0");
  r++;
  ["SECCIÓN", "CONCEPTO", "FECHA", "PROVEEDOR", "TIPO", "SERIE/NRO", "MONEDA", "MONTO"].forEach(
    (h, i) => {
      ws.getCell(r, i + 1).value = h;
      ws.getCell(r, i + 1).fill = fill(COLOR.AZUL_SUB);
      ws.getCell(r, i + 1).font = { bold: true };
    }
  );
  r++;
  for (const g of datos.gastos) {
    ws.getCell(r, 1).value = g.seccion;
    ws.getCell(r, 2).value = g.concepto;
    ws.getCell(r, 3).value = g.fecha;
    ws.getCell(r, 4).value = g.proveedor;
    ws.getCell(r, 5).value = g.tipo_comprobante;
    ws.getCell(r, 6).value = g.serie_numero;
    ws.getCell(r, 7).value = g.moneda;
    ws.getCell(r, 8).value = g.monto;
    for (let c = 1; c <= 8; c++) ws.getCell(r, c).fill = fill(COLOR.AMARILLO_EDIT);
    r++;
  }
}

// ---------- Hoja FORMATO DE COSTEO DOLAR ----------
function hojaCosteo(ws: Worksheet, datos: DatosOC, costeo: CosteoResult) {
  const N = costeo.productos.length;
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 30;
  for (let i = 0; i < N; i++) ws.getColumn(3 + i).width = 14;
  ws.getColumn(3 + N).width = 14;

  const colProd = (i: number) => 3 + i; // columnas de productos
  const colTotal = 3 + N;
  const money = "#,##0.00";

  let r = 1;
  ws.getCell(r, 1).value = "COSTEO DE IMPORTACIONES";
  ws.getCell(r, 1).font = { bold: true, size: 12 };
  r++;
  ws.getCell(r, 1).value = "RAZÓN SOCIAL:";
  ws.getCell(r, 2).value = EMPRESA.razon_social;
  r++;
  ws.getCell(r, 1).value = "RUC:";
  ws.getCell(r, 2).value = EMPRESA.ruc;
  r++;
  ws.getCell(r, 1).value = "DUA:";
  ws.getCell(r, 2).value = datos.dua.numero || "";
  r++;
  ws.getCell(r, 1).value = "TC USD:";
  ws.getCell(r, 2).value = costeo.tcUsd;
  ws.getCell(r, 2).fill = fill(COLOR.NARANJA_TC);
  r++;
  ws.getCell(r, 1).value = "TC EUR:";
  ws.getCell(r, 2).value = costeo.tcEur;
  r += 2;

  // Encabezado de productos
  ws.getCell(r, 2).value = "PRODUCTO";
  ws.getCell(r, 2).font = { bold: true };
  for (let i = 0; i < N; i++) {
    ws.getCell(r, colProd(i)).value = costeo.productos[i].nombre;
    ws.getCell(r, colProd(i)).font = { bold: true };
  }
  ws.getCell(r, colTotal).value = "TOTAL";
  ws.getCell(r, colTotal).font = { bold: true };
  r++;
  ws.getCell(r, 2).value = "CÓDIGO";
  for (let i = 0; i < N; i++) ws.getCell(r, colProd(i)).value = costeo.productos[i].codigo;
  r++;

  const filaValores = (
    etiqueta: string,
    valores: number[],
    total: number | null,
    bg?: string
  ) => {
    ws.getCell(r, 2).value = etiqueta;
    if (bg) ws.getCell(r, 2).fill = fill(bg);
    for (let i = 0; i < N; i++) {
      const c = ws.getCell(r, colProd(i));
      c.value = valores[i];
      c.numFmt = money;
      if (bg) c.fill = fill(bg);
    }
    if (total !== null) {
      const c = ws.getCell(r, colTotal);
      c.value = total;
      c.numFmt = money;
      if (bg) c.fill = fill(bg);
    }
    r++;
  };

  const P = costeo.productos;
  filaValores("VALOR EXW", P.map((p) => p.exw), P.reduce((s, p) => s + p.exw, 0), COLOR.ROJO_EXW);
  filaValores("FLETE", P.map((p) => p.flete), P.reduce((s, p) => s + p.flete, 0));
  filaValores("SEGURO", P.map((p) => p.seguro), P.reduce((s, p) => s + p.seguro, 0));
  filaValores("CIF", P.map((p) => p.cif), P.reduce((s, p) => s + p.cif, 0));

  // Gastos prorrateados
  r++;
  ws.getCell(r, 1).value = "GASTOS DE IMPORTACIÓN";
  ws.getCell(r, 1).font = { bold: true };
  r++;
  for (const g of costeo.gastos) {
    ws.getCell(r, 2).value = g.concepto + (g.esSoles ? " (S/)" : " ($)");
    for (let i = 0; i < N; i++) {
      ws.getCell(r, colProd(i)).value = g.porProducto[i];
      ws.getCell(r, colProd(i)).numFmt = money;
    }
    ws.getCell(r, colTotal).value = g.montoTotal;
    ws.getCell(r, colTotal).numFmt = money;
    r++;
  }

  filaValores(
    "TOTAL GASTOS $",
    P.map((p) => p.totalGastosUSD),
    P.reduce((s, p) => s + p.totalGastosUSD, 0),
    COLOR.ROSA_TOTAL
  );
  filaValores(
    "TOTAL GASTOS S/",
    P.map((p) => p.totalGastosSoles),
    P.reduce((s, p) => s + p.totalGastosSoles, 0),
    COLOR.ROSA_TOTAL
  );
  filaValores(
    "VALOR TOTAL $",
    P.map((p) => p.valorTotalUSD),
    costeo.totalGeneralUSD,
    COLOR.ROSA_TOTAL
  );
  filaValores(
    "VALOR TOTAL S/",
    P.map((p) => p.valorTotalSoles),
    costeo.totalGeneralSoles,
    COLOR.ROSA_TOTAL
  );
  filaValores("CANTIDAD", P.map((p) => p.cantidad), null);
  filaValores("COSTO UNITARIO $", P.map((p) => p.costoUnitUSD), null);
  filaValores("COSTO UNITARIO S/", P.map((p) => p.costoUnitSoles), null);
  filaValores("F.I.", P.map((p) => p.fi), null, COLOR.VERDE_FI);

  // SUNAT (informativo, prorrateado desde DUA)
  r++;
  filaValores("AD-VALOREM", P.map((p) => p.advalorem), P.reduce((s, p) => s + p.advalorem, 0));
  filaValores("IPM", P.map((p) => p.ipm), P.reduce((s, p) => s + p.ipm, 0));
  filaValores("IGV", P.map((p) => p.igv), P.reduce((s, p) => s + p.igv, 0));
}

export async function exportarExcel(datos: DatosOC, costeo: CosteoResult): Promise<void> {
  // Import dinámico: exceljs es pesado, solo se carga al exportar.
  const ExcelJS = (await import("exceljs")).default;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "Costeo OC Web";
  wb.created = new Date();

  hojaExtraccion(wb.addWorksheet("EXTRACCION"), datos);
  hojaCosteo(wb.addWorksheet("FORMATO DE COSTEO DOLAR"), datos, costeo);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "COSTEO " + (datos.nombre_oc || "OC") + ".xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
