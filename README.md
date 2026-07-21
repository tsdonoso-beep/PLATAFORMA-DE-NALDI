# Costeo OC — Extractor de Importaciones (Web)

Versión web del Apps Script de costeo de importaciones de INROPRIN. Lee los
documentos PDF de una Orden de Compra, los clasifica y extrae con Gemini, permite
corregir los datos y arma el **formato de costeo en dólares** con prorrateo por
factor EXW. Exporta a Excel.

## Flujo

1. **Subir** los PDFs de la OC (drag & drop). Se aplica el filtro por nombre
   (`SKIP_NOMBRES` / `FORCE_INCLUDE`); puedes incluir/excluir manualmente.
2. **Procesar**: cada documento se manda a Gemini (`gemini-3.1-flash-lite-preview`)
   con el prompt maestro, que lo clasifica en `FACTURA_COMERCIAL`, `DUA`, `GASTO`
   o `IRRELEVANTE` y extrae el JSON estructurado.
3. **Corregir**: la tabla de extracción es editable (celdas amarillas).
4. **Costear**: el costeo se recalcula en vivo. Exporta a `.xlsx`.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind.
- La **API key de Gemini** vive solo en el servidor, en el route handler
  `src/app/api/extract/route.ts` (proxy). Nunca llega al navegador.
- **ExcelJS** para la exportación (carga dinámica en el cliente).

## Estructura

| Archivo | Rol |
|---|---|
| `src/lib/prompt.ts` | Prompt maestro (el "cerebro"). Se itera aquí con el testing. |
| `src/lib/parse.ts` | Normaliza la respuesta de Gemini. |
| `src/lib/consolidar.ts` | Filtro por nombre + consolidación de la OC. |
| `src/lib/costeo.ts` | Prorrateo por factor EXW → tabla de costeo. |
| `src/lib/excel.ts` | Exportación a `.xlsx`. |
| `src/app/api/extract/route.ts` | Proxy a Gemini (API key server-side). |
| `src/app/page.tsx` | Orquestación del flujo. |

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y pon tu GEMINI_API_KEY
npm run dev
```

Abre http://localhost:3000

## Pendiente / próximas iteraciones

- Afinar el prompt maestro con documentos reales (testing).
- Fórmulas vivas en el Excel exportado (hoy exporta valores calculados).
- Opción de conectar Google Drive (hoy: subida manual).
- Hoja LOG de extracción en el Excel.
