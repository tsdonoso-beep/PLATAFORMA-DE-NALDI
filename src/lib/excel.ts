// ============================================================
// Generador de costeo en Excel — port fiel del generador Python
// (generar_costeo_v3). Produce DOS hojas vinculadas por fórmula:
//   1) EXTRACCION : datos crudos con semáforo de calidad.
//   2) COSTEO     : réplica del formato del área, TODO formulado
//                   (=EXTRACCION!Xn). Editas EXTRACCION → COSTEO recalcula.
// Se adapta a N productos y M gastos.
// ============================================================

import type { Workbook, Worksheet, Cell } from "exceljs";
import { EMPRESA } from "./config";
import { DatosOC } from "./types";

// ---------- Paleta (idéntica al script Python) ----------
const AZUL = "1F4E79";
const CELESTE = "DDEBF7";
const ROSA = "FCE4EC";
const VERDE = "E2EFDA";
const AMAR = "FFFF00";
const AMARS = "FFF2CC";
const ROJO = "F8CBAD";
const GRIS = "F2F2F2";
const VERDE_HDR = "548235";
const BLANCO = "FFFFFF";

const NF = "#,##0.00";
const PF = "0.00%";

// ---------- Estructura que consume el generador (mirror del dict Python) ----------
interface GenProducto {
  codigo: string;
  nombre: string;
  cantidad: number;
  exw: number | "";
  moneda: string;
  partida: string;
  peso: string;
  confianza: string;
}
interface GenGasto {
  seccion: string;
  concepto: string;
  fecha: string;
  proveedor: string;
  tipo: string;
  serie: string;
  moneda: string;
  monto: number | "";
  igv: string | number;
  confianza: string;
}
interface GenDataset {
  generales: {
    razon_social: string;
    ruc: string;
    periodo: number;
    tipo_carga: string;
    dua: string;
    proyecto: string;
    oc: string;
    oc_titulo: string;
    proveedor: string;
    tc_usd: number | "";
    tc_eur: number | "";
  };
  productos: GenProducto[];
  gastos: GenGasto[];
}

// Convierte el DatosOC de la web al dataset que espera el generador.
function adaptar(datos: DatosOC): GenDataset {
  const oc = datos.factura.numero_oc || datos.nombre_oc || "";
  return {
    generales: {
      razon_social: EMPRESA.razon_social,
      ruc: EMPRESA.ruc,
      periodo: datos.periodo || new Date().getFullYear(),
      tipo_carga: datos.tipo_carga || "TOTAL",
      dua: datos.dua.numero || "",
      proyecto: datos.proyecto || "",
      oc,
      oc_titulo: datos.oc_titulo || (oc ? "OC- GASTOS DESADUANAJE " + oc : ""),
      proveedor: datos.factura.proveedor || "",
      tc_usd: datos.dua.tc_usd || "",
      tc_eur: datos.tc_eur || "",
    },
    productos: datos.productos.map((p) => ({
      codigo: p.codigo || "",
      nombre: p.nombre || "",
      cantidad: p.cantidad || 0,
      exw: p.exw_total === null || p.exw_total === undefined ? "" : p.exw_total,
      moneda: datos.factura.moneda || "USD",
      partida: "",
      peso: "",
      confianza: "alta",
    })),
    // Solo los gastos que el costeador dejó incluidos entran al costeo.
    gastos: datos.gastos
      .filter((g) => g.incluido !== false)
      .map((g) => ({
        seccion: g.seccion || "",
        concepto: g.concepto || "",
        fecha: g.fecha || "",
        proveedor: g.proveedor || "",
        tipo: g.tipo_comprobante || "",
        serie: g.serie_numero || "",
        moneda: g.moneda || "DÓLARES",
        monto: g.monto === null || g.monto === undefined ? "" : g.monto,
        igv: "",
        confianza: "alta",
      })),
  };
}

// ---------- helpers de estilo ----------
const fill = (hex: string) => ({
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FF" + hex },
});
const thin = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const BD = { top: thin, left: thin, bottom: thin, right: thin };
const CEN = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };
const LFT = { horizontal: "left" as const, vertical: "middle" as const, wrapText: true };
const RGT = { horizontal: "right" as const, vertical: "middle" as const };

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

interface PutOpts {
  val?: string | number;
  formula?: string;
  bold?: boolean;
  size?: number;
  color?: string;
  italic?: boolean;
  bg?: string;
  align?: typeof CEN | typeof LFT | typeof RGT;
  fmt?: string;
  border?: boolean;
  note?: string;
}
function put(ws: Worksheet, coord: string, o: PutOpts): Cell {
  const c = ws.getCell(coord);
  if (o.formula !== undefined) c.value = { formula: o.formula } as unknown as Cell["value"];
  // No escribimos "" para que la celda quede vacía (None), igual que el Python.
  else if (o.val !== undefined && o.val !== "") c.value = o.val;
  c.font = {
    name: "Calibri",
    size: o.size ?? 9,
    bold: o.bold,
    italic: o.italic,
    color: { argb: "FF" + (o.color ?? "000000") },
  };
  if (o.bg) c.fill = fill(o.bg);
  if (o.align) c.alignment = o.align;
  if (o.fmt) c.numFmt = o.fmt;
  if (o.border) c.border = BD;
  if (o.note) c.note = o.note;
  return c;
}

// ═══════════════════════════════════════════════════════════
//  HOJA 1: EXTRACCION
// ═══════════════════════════════════════════════════════════
interface Refs {
  gen: Record<string, string>;
  productos: { codigo: string; cantidad: string; exw: string; nombre: string }[];
  gastos: {
    seccion: string;
    concepto: string;
    fecha: string;
    proveedor: string;
    tipo: string;
    serie: string;
    moneda: string;
    monto: string;
  }[];
}

function hojaExtraccion(ws: Worksheet, d: GenDataset): Refs {
  ws.views = [{ showGridLines: false }];
  ws.getColumn("A").width = 22;
  ws.getColumn("B").width = 42;
  ["C", "D", "E", "F", "G", "H", "I", "J"].forEach((c) => (ws.getColumn(c).width = 16));

  const refs: Refs = { gen: {}, productos: [], gastos: [] };
  const g = d.generales;

  ws.mergeCells("A1:J1");
  put(ws, "A1", {
    val: "EXTRACCIÓN DE DATOS (OCR / PARSER)  —  fuente cruda para el costeo",
    size: 8,
    bold: true,
    color: BLANCO,
    bg: AZUL,
    align: CEN,
    border: true,
  });
  put(ws, "A2", { val: "Leyenda:", size: 9, bold: true });
  put(ws, "B2", { val: "■ Verde = se usa en el cálculo", size: 7, italic: true, color: "808080", bg: VERDE, align: LFT, border: true });
  put(ws, "C2", { val: "■ Rojo = dato faltante (obligatorio)", size: 7, italic: true, color: "808080", bg: ROJO, align: LFT, border: true });
  put(ws, "D2", { val: "■ Amarillo = baja confianza (revisar)", size: 7, italic: true, color: "808080", bg: AMARS, align: LFT, border: true });

  // DATOS GENERALES
  let r = 4;
  ws.mergeCells(`A${r}:B${r}`);
  put(ws, `A${r}`, { val: "DATOS GENERALES", size: 8, bold: true, color: BLANCO, bg: AZUL, align: LFT, border: true });
  r += 1;
  const generalesMap: [string, string, boolean][] = [
    ["razon_social", "Razón social", false],
    ["ruc", "RUC", false],
    ["periodo", "Periodo", false],
    ["tipo_carga", "Tipo de carga", false],
    ["dua", "DUA", true],
    ["proyecto", "Proyecto", false],
    ["oc", "OC", true],
    ["proveedor", "Proveedor", true],
    ["tc_usd", "Tipo de cambio USD", true],
    ["tc_eur", "Tipo de cambio EUR", false],
  ];
  for (const [key, label, usado] of generalesMap) {
    const val = (g as Record<string, string | number>)[key];
    put(ws, `A${r}`, { val: label, size: 9, bold: true, align: LFT, border: true });
    const falta = val === null || val === undefined || val === "";
    const bg = falta ? ROJO : usado ? VERDE : undefined;
    put(ws, `B${r}`, {
      val: falta ? "FALTA" : val,
      size: 9,
      color: usado ? "0000FF" : "000000",
      bg,
      align: LFT,
      border: true,
      note: falta
        ? "Dato obligatorio ausente en el OCR. Completar manualmente."
        : usado
        ? "Campo usado en el costeo."
        : undefined,
    });
    refs.gen[key] = `EXTRACCION!$B$${r}`;
    r += 1;
  }

  // PRODUCTOS
  r += 1;
  ws.mergeCells(`A${r}:J${r}`);
  put(ws, `A${r}`, { val: "PRODUCTOS (código, cantidad y EXW alimentan el costeo)", size: 8, bold: true, color: BLANCO, bg: AZUL, align: LFT, border: true });
  r += 1;
  const cols: [string, string, boolean][] = [
    ["A", "Código", true],
    ["B", "Nombre", false],
    ["C", "Cantidad", true],
    ["D", "EXW USD", true],
    ["E", "Moneda", false],
    ["F", "Partida arancel.", false],
    ["G", "Peso (kg)", false],
    ["H", "Confianza", false],
  ];
  for (const [c, label, usado] of cols) {
    put(ws, `${c}${r}`, { val: label, size: 8, bold: true, color: BLANCO, bg: usado ? VERDE_HDR : AZUL, align: CEN, border: true });
  }
  r += 1;
  for (const p of d.productos) {
    const conf = p.confianza || "alta";
    const faltaCod = !p.codigo;
    const faltaExw = p.exw === null || p.exw === undefined || p.exw === "";
    put(ws, `A${r}`, { val: faltaCod ? "FALTA" : p.codigo, size: 9, bg: faltaCod ? ROJO : VERDE, align: CEN, border: true });
    put(ws, `B${r}`, { val: p.nombre, size: 9, align: LFT, border: true });
    put(ws, `C${r}`, { val: p.cantidad ?? 1, size: 9, color: "0000FF", bg: VERDE, align: RGT, fmt: "0", border: true });
    put(ws, `D${r}`, { val: faltaExw ? "FALTA" : p.exw, size: 9, color: "0000FF", bg: faltaExw ? ROJO : VERDE, align: RGT, fmt: NF, border: true });
    put(ws, `E${r}`, { val: p.moneda || "USD", size: 9, align: CEN, border: true });
    put(ws, `F${r}`, { val: p.partida || "", size: 9, align: CEN, border: true });
    put(ws, `G${r}`, { val: p.peso || "", size: 9, align: RGT, border: true });
    put(ws, `H${r}`, { val: conf, size: 7, italic: true, color: "808080", bg: conf !== "alta" ? AMARS : undefined, align: CEN, border: true });
    refs.productos.push({
      codigo: `EXTRACCION!$A$${r}`,
      cantidad: `EXTRACCION!$C$${r}`,
      exw: `EXTRACCION!$D$${r}`,
      nombre: `EXTRACCION!$B$${r}`,
    });
    r += 1;
  }

  // GASTOS
  r += 1;
  ws.mergeCells(`A${r}:J${r}`);
  put(ws, `A${r}`, { val: "GASTOS DE NACIONALIZACIÓN (monto alimenta el costeo)", size: 8, bold: true, color: BLANCO, bg: AZUL, align: LFT, border: true });
  r += 1;
  const gcols: [string, string, boolean][] = [
    ["A", "Sección", false],
    ["B", "Concepto", false],
    ["C", "Fecha", false],
    ["D", "Proveedor", false],
    ["E", "Tipo", false],
    ["F", "Serie/Número", false],
    ["G", "Moneda", false],
    ["H", "Monto", true],
    ["I", "IGV", false],
    ["J", "Confianza", false],
  ];
  for (const [c, label, usado] of gcols) {
    put(ws, `${c}${r}`, { val: label, size: 8, bold: true, color: BLANCO, bg: usado ? VERDE_HDR : AZUL, align: CEN, border: true });
  }
  r += 1;
  for (const gto of d.gastos) {
    const conf = gto.confianza || "alta";
    const monto = gto.monto;
    const faltaMonto = monto === null || monto === undefined;
    put(ws, `A${r}`, { val: gto.seccion || "", size: 9, align: CEN, border: true });
    put(ws, `B${r}`, { val: gto.concepto || "", size: 9, align: LFT, border: true });
    put(ws, `C${r}`, { val: gto.fecha || "", size: 9, align: CEN, border: true });
    put(ws, `D${r}`, { val: gto.proveedor || "", size: 9, align: LFT, border: true });
    put(ws, `E${r}`, { val: gto.tipo || "", size: 9, align: CEN, border: true });
    put(ws, `F${r}`, { val: gto.serie || "", size: 9, align: CEN, border: true });
    put(ws, `G${r}`, { val: gto.moneda || "DÓLARES", size: 9, align: CEN, border: true });
    put(ws, `H${r}`, { val: faltaMonto ? "FALTA" : (monto as number), size: 9, color: "0000FF", bg: faltaMonto ? ROJO : VERDE, align: RGT, fmt: NF, border: true });
    put(ws, `I${r}`, { val: gto.igv || "", size: 9, align: RGT, fmt: NF, border: true });
    put(ws, `J${r}`, { val: conf, size: 7, italic: true, color: "808080", bg: conf !== "alta" ? AMARS : undefined, align: CEN, border: true });
    refs.gastos.push({
      seccion: `EXTRACCION!$A$${r}`,
      concepto: `EXTRACCION!$B$${r}`,
      fecha: `EXTRACCION!$C$${r}`,
      proveedor: `EXTRACCION!$D$${r}`,
      tipo: `EXTRACCION!$E$${r}`,
      serie: `EXTRACCION!$F$${r}`,
      moneda: `EXTRACCION!$G$${r}`,
      monto: `EXTRACCION!$H$${r}`,
    });
    r += 1;
  }

  return refs;
}

// ═══════════════════════════════════════════════════════════
//  HOJA 2: COSTEO
// ═══════════════════════════════════════════════════════════
function hojaCosteo(ws: Worksheet, d: GenDataset, ref: Refs) {
  ws.views = [{ showGridLines: false }];
  const g = d.generales;
  const N = d.productos.length;

  const baseW: Record<string, number> = { A: 11, B: 30, C: 13, D: 20, E: 13, F: 14, G: 6, H: 10, I: 11 };
  Object.entries(baseW).forEach(([k, v]) => (ws.getColumn(k).width = v));

  // 2 columnas por producto (S/, $) desde J (col 10).
  const START = 10;
  const pair: [string, string][] = [];
  for (let i = 0; i < N; i++) {
    const s = colLetter(START + i * 2);
    const dcol = colLetter(START + i * 2 + 1);
    pair.push([s, dcol]);
    ws.getColumn(s).width = 13;
    ws.getColumn(dcol).width = 13;
  }
  const totS = colLetter(START + N * 2);
  const totD = colLetter(START + N * 2 + 1);
  ws.getColumn(totS).width = 13;
  ws.getColumn(totD).width = 13;

  // CABECERA
  put(ws, "B1", { val: "COSTEO DE IMPORTACIONES :", size: 12, bold: true });
  put(ws, "B2", { val: "RAZÓN SOCIAL :", size: 9, bold: true });
  put(ws, "D2", { formula: ref.gen.razon_social, size: 9, color: AZUL, align: LFT });
  put(ws, "B3", { val: "RUC :", size: 9, bold: true });
  put(ws, "D3", { formula: ref.gen.ruc, size: 9, color: AZUL });
  put(ws, "B4", { val: "PERIODO:", size: 9, bold: true });
  put(ws, "D4", { formula: ref.gen.periodo, size: 9, color: AZUL });
  put(ws, "B5", { val: "TIPO DE CARGA:", size: 9, bold: true });
  put(ws, "D5", { formula: ref.gen.tipo_carga, size: 9, color: AZUL });
  put(ws, "B6", { val: "DUA:", size: 9, bold: true });
  put(ws, "D6", { formula: ref.gen.dua, size: 9, color: AZUL });
  put(ws, "B7", { val: "PROYECTO :", size: 9, bold: true });
  put(ws, "D7", { formula: ref.gen.proyecto, size: 9, color: AZUL, align: LFT });

  // Caja tipo de cambio
  ws.mergeCells("F1:G1");
  put(ws, "F1", { val: "Tipo de cambio", size: 8, bold: true, bg: GRIS, align: CEN, border: true });
  const TC = "$F$2";
  put(ws, "F2", { formula: ref.gen.tc_usd, size: 9, color: AZUL, bg: GRIS, align: RGT, fmt: "0.00", border: true });
  put(ws, "G2", { val: "USD", size: 9, align: LFT, border: true });
  put(ws, "F3", { formula: ref.gen.tc_eur, size: 9, color: AZUL, bg: GRIS, align: RGT, fmt: "0.000", border: true });
  put(ws, "G3", { val: "EUR", size: 9, align: LFT, border: true });

  // Título OC
  ws.mergeCells("D9:H9");
  put(ws, "D9", { val: g.oc_titulo || `OC ${g.oc}`, size: 9, bold: true, bg: ROSA, align: CEN, border: true });

  // Encabezados producto
  put(ws, "B10", { val: "PROVEEDOR", size: 9, bold: true, align: CEN, border: true });
  put(ws, "B11", { val: "CÓDIGO", size: 9, bold: true, align: CEN, border: true });
  put(ws, "B12", { val: "PRODUCTO", size: 9, bold: true, align: CEN, border: true });
  put(ws, "B13", { val: "ORDEN DE COMPRA", size: 9, bold: true, align: CEN, border: true });
  for (let i = 0; i < N; i++) {
    const [sc, dc] = pair[i];
    ws.mergeCells(`${sc}10:${dc}10`);
    put(ws, `${sc}10`, { formula: ref.gen.proveedor, size: 9, bg: CELESTE, align: CEN, border: true });
    ws.mergeCells(`${sc}11:${dc}11`);
    put(ws, `${sc}11`, { formula: ref.productos[i].codigo, size: 9, bg: CELESTE, align: CEN, border: true });
    ws.mergeCells(`${sc}12:${dc}12`);
    put(ws, `${sc}12`, { formula: ref.productos[i].nombre, size: 9, bg: CELESTE, align: CEN, border: true });
    ws.mergeCells(`${sc}13:${dc}13`);
    put(ws, `${sc}13`, { formula: ref.gen.oc, size: 9, bg: CELESTE, align: CEN, border: true });
  }
  ws.mergeCells(`${totS}10:${totD}12`);
  put(ws, `${totS}10`, { val: "TOTAL", size: 9, bold: true, bg: GRIS, align: CEN, border: true });

  // Encabezado de tabla
  const H = 14;
  const hdrs: [string, string][] = [
    ["A", "SEC"], ["B", "Descripción"], ["C", "Fecha de Emision"], ["D", "PROVEEDOR"],
    ["E", "Tipo/Comprob."], ["F", "Serie/Número"], ["G", "TC"], ["H", "MONEDA"], ["I", "MONTO"],
  ];
  for (const [c, t] of hdrs) put(ws, `${c}${H}`, { val: t, size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });
  for (let i = 0; i < N; i++) {
    const [sc, dc] = pair[i];
    put(ws, `${sc}${H}`, { val: "Importe S/", size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });
    put(ws, `${dc}${H}`, { val: "Importe $", size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });
  }
  put(ws, `${totS}${H}`, { val: "Importe S/.", size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });
  put(ws, `${totD}${H}`, { val: "Importe $", size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });

  // VALOR EXW
  const EXW = 15;
  put(ws, `B${EXW}`, { val: "VALOR EXW", size: 9, bold: true, bg: GRIS, align: LFT, border: true });
  put(ws, `H${EXW}`, { val: "DÓLARES", size: 7, italic: true, color: "808080", align: CEN, border: true });
  for (let i = 0; i < N; i++) {
    const [sc, dc] = pair[i];
    put(ws, `${dc}${EXW}`, { formula: `IF(ISNUMBER(${ref.productos[i].exw}),${ref.productos[i].exw},0)`, size: 9, color: AZUL, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${EXW}`, { size: 9, align: RGT, fmt: NF, border: true });
  }
  put(ws, `${totD}${EXW}`, { formula: Array.from({ length: N }, (_, i) => `${pair[i][1]}${EXW}`).join("+"), size: 9, bold: true, align: RGT, fmt: NF, border: true });

  // Filas de gastos (dinámico) — factor cells se definen abajo ($D$FAC..)
  const GST = EXW + 1;
  let r = GST;
  let secPrev: string | null = null;
  // El factor de cada producto vive en $D$(FAC_START+i); FAC_START se calcula igual que Python.
  // Pre-cálculo de filas para poder referenciar el factor antes de escribirlo.
  const GEND = GST + d.gastos.length - 1;
  const TG = GEND + 1;
  const VT = TG + 1;
  const FAC_HDR = VT + 3;
  const FAC_START = FAC_HDR + 1;
  const FAC_TOT = FAC_START + N;
  const factorCell = (i: number) => `$D$${FAC_START + i}`;

  for (let idx = 0; idx < d.gastos.length; idx++) {
    const gto = d.gastos[idx];
    const gr = ref.gastos[idx];
    const secVal = gto.seccion || "";
    const nuevaSec = secVal !== secPrev;
    put(ws, `A${r}`, {
      formula: nuevaSec ? gr.seccion : undefined,
      val: nuevaSec ? undefined : "",
      size: 8,
      bold: nuevaSec,
      color: nuevaSec ? BLANCO : "000000",
      bg: nuevaSec ? AZUL : undefined,
      align: CEN,
      border: true,
    });
    secPrev = secVal;
    put(ws, `B${r}`, { formula: gr.concepto, size: 9, color: AZUL, align: LFT, border: true });
    put(ws, `C${r}`, { formula: gr.fecha, size: 9, color: AZUL, align: CEN, border: true });
    put(ws, `D${r}`, { formula: gr.proveedor, size: 9, color: AZUL, align: LFT, border: true });
    put(ws, `E${r}`, { formula: gr.tipo, size: 9, color: AZUL, align: CEN, border: true });
    put(ws, `F${r}`, { formula: gr.serie, size: 9, color: AZUL, align: CEN, border: true });
    put(ws, `G${r}`, { size: 9, align: CEN, border: true }); // TC por fila (opcional)
    put(ws, `H${r}`, { formula: gr.moneda, size: 9, color: AZUL, align: CEN, border: true });
    put(ws, `I${r}`, { formula: gr.monto, size: 9, color: AZUL, align: RGT, fmt: NF, border: true });
    r += 1;
  }

  // TOTAL GASTOS / VALOR TOTAL
  put(ws, `B${TG}`, { val: "TOTAL GASTOS", size: 9, bold: true, bg: ROSA, align: RGT, border: true });
  put(ws, `B${VT}`, { val: "VALOR TOTAL", size: 9, bold: true, bg: ROSA, align: RGT, border: true });

  // Bloque FACTOR
  put(ws, `D${FAC_HDR}`, { val: "FACTOR:", size: 9, bold: true, bg: GRIS, align: CEN, border: true });
  for (let i = 0; i < N; i++) {
    const rr = FAC_START + i;
    put(ws, `B${rr}`, { formula: ref.productos[i].nombre, size: 9, color: AZUL, align: LFT, border: true });
    put(ws, `C${rr}`, { formula: `IF(ISNUMBER(${ref.productos[i].exw}),${ref.productos[i].exw},0)`, size: 9, color: AZUL, align: RGT, fmt: "\\$#,##0.00", border: true });
    put(ws, `D${rr}`, { formula: `IFERROR(C${rr}/$C$${FAC_TOT},0)`, size: 9, align: RGT, fmt: PF, border: true });
  }
  put(ws, `B${FAC_TOT}`, { val: "TOTAL", size: 9, bold: true, align: LFT, border: true });
  put(ws, `C${FAC_TOT}`, { formula: `SUM(C${FAC_START}:C${FAC_TOT - 1})`, size: 9, bold: true, align: RGT, fmt: "\\$#,##0.00", border: true });

  // Relleno fórmulas de distribución de gastos
  for (let gr = GST; gr <= GEND; gr++) {
    for (let i = 0; i < N; i++) {
      const [sc, dc] = pair[i];
      put(ws, `${dc}${gr}`, { formula: `IF(ISNUMBER($I${gr}),$I${gr}*${factorCell(i)},0)`, size: 9, align: RGT, fmt: NF, border: true });
      put(ws, `${sc}${gr}`, { formula: `IF($G${gr}="","",${dc}${gr}*$G${gr})`, size: 9, align: RGT, fmt: NF, border: true });
    }
    put(ws, `${totD}${gr}`, { formula: Array.from({ length: N }, (_, i) => `${pair[i][1]}${gr}`).join("+"), size: 9, align: RGT, fmt: NF, border: true });
    put(ws, `${totS}${gr}`, { formula: `IF($G${gr}="","",${totD}${gr}*$G${gr})`, size: 9, align: RGT, fmt: NF, border: true });
  }

  // TOTAL GASTOS por columna
  for (let i = 0; i < N; i++) {
    const [sc, dc] = pair[i];
    put(ws, `${dc}${TG}`, { formula: `SUM(${dc}${GST}:${dc}${GEND})`, size: 9, bold: true, bg: ROSA, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${TG}`, { formula: `SUM(${sc}${GST}:${sc}${GEND})`, size: 9, bold: true, bg: ROSA, align: RGT, fmt: NF, border: true });
  }
  put(ws, `${totD}${TG}`, { formula: `SUM(${totD}${GST}:${totD}${GEND})`, size: 9, bold: true, bg: ROSA, align: RGT, fmt: NF, border: true });
  put(ws, `${totS}${TG}`, { formula: `SUM(${totS}${GST}:${totS}${GEND})`, size: 9, bold: true, bg: ROSA, align: RGT, fmt: NF, border: true });

  // VALOR TOTAL = EXW + total gastos
  for (let i = 0; i < N; i++) {
    const [, dc] = pair[i];
    put(ws, `${dc}${VT}`, { formula: `${dc}${EXW}+${dc}${TG}`, size: 9, bold: true, bg: ROSA, align: RGT, fmt: NF, border: true });
  }

  // Bloque IMPORTACIONES (soles)
  const IMP = FAC_TOT + 3;
  ws.mergeCells(`B${IMP}:H${IMP}`);
  put(ws, `B${IMP}`, { val: "IMPORTACIONES", size: 8, bold: true, color: BLANCO, bg: AZUL, align: CEN, border: true });
  const rowE = IMP + 1, rowG = IMP + 2, rowS = IMP + 3, rowV = IMP + 4;
  const rowF = IMP + 5, rowC = IMP + 6, rowU = IMP + 7, rowP = IMP + 8;
  const labels: [number, string][] = [
    [rowE, "VALOR EXW S/"], [rowG, "TOTAL GASTOS"], [rowS, "SUMA $ + S/"], [rowV, "VALOR TOTAL"],
    [rowF, "F.I."], [rowC, "CANTIDAD"], [rowU, "COSTO UNITARIO"], [rowP, "% IMPORTACIÓN"],
  ];
  for (const [rr, txt] of labels) {
    const bg = txt === "F.I." ? VERDE : txt === "COSTO UNITARIO" ? AMAR : GRIS;
    ws.mergeCells(`B${rr}:H${rr}`);
    put(ws, `B${rr}`, { val: txt, size: 9, bold: true, bg, align: RGT, border: true });
  }
  for (let i = 0; i < N; i++) {
    const [sc, dc] = pair[i];
    put(ws, `${sc}${rowE}`, { formula: `${dc}${EXW}*${TC}`, size: 9, bold: true, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${rowG}`, { formula: `${sc}${TG}`, size: 9, align: RGT, fmt: NF, border: true });
    put(ws, `${dc}${rowG}`, { formula: `${dc}${TG}*${TC}`, size: 9, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${rowS}`, { formula: `${sc}${rowG}+${dc}${rowG}`, size: 9, bold: true, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${rowV}`, { formula: `${sc}${rowE}+${sc}${rowS}`, size: 9, bold: true, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${rowF}`, { formula: `IFERROR(${sc}${rowV}/${sc}${rowE},0)`, size: 9, bold: true, bg: VERDE, align: RGT, fmt: "0.00", border: true });
    put(ws, `${sc}${rowC}`, { formula: ref.productos[i].cantidad, size: 9, color: AZUL, align: RGT, fmt: "0", border: true });
    put(ws, `${sc}${rowU}`, { formula: `IFERROR((${sc}${rowE}/${sc}${rowC})*${sc}${rowF},0)`, size: 9, bold: true, bg: AMAR, align: RGT, fmt: NF, border: true });
    put(ws, `${sc}${rowP}`, { formula: `${sc}${rowF}-1`, size: 9, align: RGT, fmt: PF, border: true });
  }

  // Panel de alertas
  const ALERT = rowP + 2;
  ws.mergeCells(`B${ALERT}:H${ALERT}`);
  const faltanGastos = `SUMPRODUCT(--NOT(ISNUMBER(I${GST}:I${GEND})))`;
  const faltanExw = Array.from({ length: N }, (_, i) => `--NOT(ISNUMBER(${pair[i][1]}${EXW}))`).join("+");
  put(ws, `B${ALERT}`, {
    formula:
      `IF((${faltanGastos})+(${faltanExw})=0,"✓ Datos completos — costeo confiable",` +
      `"⚠ FALTAN "&((${faltanGastos})+(${faltanExw}))&" dato(s) — revisar hoja EXTRACCION (celdas rojas)")`,
    size: 9,
    bold: true,
    bg: GRIS,
    align: CEN,
    border: true,
    note: "Semáforo automático: verde si todo está completo, rojo si falta algún monto o EXW.",
  });

  const LEG = ALERT + 2;
  put(ws, `B${LEG}`, { val: "Datos traídos de la hoja EXTRACCION (azul). Corrige ahí y aquí se recalcula.", size: 7, italic: true, color: "808080", align: LFT });
  put(ws, `B${LEG + 1}`, { val: "Amarillo = editable directo. F.I. = Valor total ÷ Valor EXW. Costo unitario incluye todos los gastos prorrateados.", size: 7, italic: true, color: "808080", align: LFT });
  put(ws, `B${LEG + 2}`, { val: "Si el panel de arriba marca FALTAN datos, el costeo trata esos montos como 0 hasta que los completes.", size: 7, italic: true, color: "808080", align: LFT });
}

// ═══════════════════════════════════════════════════════════
//  ORQUESTADOR
// ═══════════════════════════════════════════════════════════
export async function construirWorkbook(datos: DatosOC): Promise<Workbook> {
  const ExcelJS = (await import("exceljs")).default;
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = "Costeo OC Web";
  wb.created = new Date();

  const d = adaptar(datos);
  const wsExt = wb.addWorksheet("EXTRACCION");
  const wsCost = wb.addWorksheet("COSTEO");
  const ref = hojaExtraccion(wsExt, d);
  hojaCosteo(wsCost, d, ref);

  // COSTEO como hoja activa al abrir.
  wsCost.state = "visible";
  wb.views = [
    {
      x: 0,
      y: 0,
      width: 20000,
      height: 12000,
      firstSheet: 0,
      activeTab: 1,
      visibility: "visible",
    },
  ];
  return wb;
}

export async function exportarExcel(datos: DatosOC): Promise<void> {
  const wb = await construirWorkbook(datos);
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
