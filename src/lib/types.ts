// ============================================================
// Tipos del dominio de costeo de importaciones
// Reutiliza el esquema JSON del prompt maestro del Apps Script.
// ============================================================

export type TipoDoc = "FACTURA_COMERCIAL" | "DUA" | "GASTO" | "IRRELEVANTE";

export interface Factura {
  proveedor: string;
  pais_proveedor: string;
  numero_factura: string;
  fecha_factura: string;
  incoterm: string;
  moneda: string; // "USD" | "EUR"
  numero_oc: string;
  descuento_porcentaje: number;
  total_exw: number;
  notas: string;
}

export interface Producto {
  nombre: string;
  codigo: string;
  cantidad: number;
  precio_unit: number;
  exw_total: number;
}

export interface Dua {
  numero: string;
  fecha: string;
  tc_usd: number;
  tc_eur: number;
  fob_usd: number;
  flete_usd: number;
  seguro_usd: number;
  cif_usd: number;
  ad_valorem_usd: number;
  ipm_usd: number;
  igv_usd: number;
  total_tributos_usd: number;
}

export interface Gasto {
  seccion: string;
  concepto: string;
  fecha: string;
  proveedor: string;
  tipo_comprobante: string;
  serie_numero: string;
  moneda: string; // "DÓLARES" | "SOLES" | "EUROS"
  monto: number;
  // Inclusión en el costeo (el costeador del área puede desmarcarlo).
  incluido?: boolean;
  // Origen del gasto: "documento" (factura/nota) o "dua" (derivado de la DUA).
  origen?: "documento" | "dua";
}

// Resultado normalizado de parsear la respuesta de Gemini para 1 documento.
export interface ResultadoDoc {
  tipo: TipoDoc;
  factura?: Factura;
  productos?: Producto[];
  total_exw?: number;
  dua?: Dua;
  gastos?: Gasto[];
}

// Estado de un documento subido en el frontend.
export interface DocItem {
  id: string;
  nombre: string;
  tamanoKB: number;
  // base64 del PDF (sin prefijo data:)
  base64: string;
  mimeType: string;
  // filtro por nombre
  incluido: boolean; // true = va a Gemini
  motivoFiltro?: "force" | "skip" | "normal";
  // resultado del procesamiento
  procesado?: boolean;
  resultado?: ResultadoDoc;
  raw?: string;
  error?: string;
}

// Datos consolidados de toda la OC (equivale a `datos` del script).
export interface DatosOC {
  nombre_oc: string;
  factura: Factura;
  productos: Producto[];
  dua: Partial<Dua>;
  gastos: Gasto[];
  tc_eur: number;
  tc_eur_gemini: number;
  // Campos "generales" del formato de costeo (editables en la UI).
  proyecto: string;
  periodo: number;
  tipo_carga: string;
  oc_titulo: string;
}

export const FACTURA_VACIA: Factura = {
  proveedor: "",
  pais_proveedor: "",
  numero_factura: "",
  fecha_factura: "",
  incoterm: "EXW",
  moneda: "USD",
  numero_oc: "",
  descuento_porcentaje: 0,
  total_exw: 0,
  notas: "",
};
