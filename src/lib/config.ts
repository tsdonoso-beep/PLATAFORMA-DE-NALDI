// ============================================================
// Configuración heredada del Apps Script INROPRIN
// ============================================================

export const GEMINI_MODELO = "gemini-3.1-flash-lite-preview";

// Pausa entre documentos (ms) para no saturar el límite RPM de Gemini
// y dar un punto natural para interrumpir el proceso.
export const PAUSA_MS = 2500;

// Nombres que, si aparecen, hacen que el documento se salte por defecto.
export const SKIP_NOMBRES = [
  "swift",
  "datos bancarios",
  "correo validacion",
  "correo de validacion",
  "validacion tecnica",
  "req ",
  "requerimiento",
  "cotizacion",
  "canal verde",
  "packing list",
  "bl draft",
];

// Nombres que fuerzan la inclusión aunque coincidan con SKIP.
export const FORCE_INCLUDE = [
  "invoice",
  "factura",
  "dua",
  "dam",
  "liquidac",
  "flete",
  "almacen",
  "deposito",
  "comision",
  "transporte",
  "cuadrilla",
  "sunat",
  "pago oc",
  "igv",
  "ipm",
  "dhl",
  "f200-",
  "f205-",
  "0160-",
  "20101128",
];

export const EMPRESA = {
  razon_social: "INDUSTRIAS ROLAND PRINT S.A.C.",
  ruc: "20512201611",
};

// Colores heredados (hex) para replicar el formato del costeo en Excel/UI.
export const COLOR = {
  ROJO_EXW: "E06666",
  AZUL_CARGA: "A4C2F4",
  AZUL_HEADER: "D9E2F3",
  ROSA_TOTAL: "F4CCCC",
  VERDE_FI: "D9EAD3",
  AMARILLO_FI: "FFFF00",
  NARANJA_TC: "E6B8AF",
  AMARILLO_EDIT: "FFF9C4",
  AZUL_OSCURO: "1A237E",
  AZUL_SUB: "E3F2FD",
  GRIS_SEC: "D9D9D9",
  VERDE_LOG: "E2EFDA",
  ROJO_FALTA: "FFDDD9",
  NARANJA_WARN: "FFE0B2",
  SKIP_COLOR: "F5F5F5",
};
