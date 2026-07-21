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

## API Key (cada usuario la suya)

Igual que el Apps Script, **cada persona configura su propia Gemini API Key**
(botón "⚙ API Key"). Así cada quien consume su propio límite RPM/RPD y no se
saturan los 500 RPD entre todos. La key se guarda solo en el navegador
(`localStorage`) y se manda con cada petición al proxy, que la usa pero **no la
almacena**. La variable `GEMINI_API_KEY` del servidor queda solo como respaldo
opcional para desarrollo.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind.
- Proxy a Gemini en `src/app/api/extract/route.ts`; test de conexión en
  `src/app/api/test/route.ts`.
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

## Exportación a Excel (dos hojas vinculadas por fórmula)

El `.xlsx` que genera la web es un **port fiel del generador Python del área**
(`generar_costeo_v3`). Produce dos hojas:

- **EXTRACCION**: datos crudos con semáforo de calidad (🟩 verde = se usa,
  🟥 rojo = falta obligatorio, 🟨 amarillo = baja confianza).
- **COSTEO**: réplica del formato del área, **100 % formulado** con
  `=EXTRACCION!...`. Se edita en EXTRACCION y COSTEO recalcula solo. Incluye
  bloque FACTOR (prorrateo por EXW), bloque IMPORTACIONES en soles (F.I.,
  costo unitario, % importación) y un panel de alertas que cuenta datos faltantes.

Se adapta a N productos y M gastos. La fidelidad está verificada con un test de
regresión contra un Excel de referencia (OC 579-2025): **cero diferencias** en
valores, fórmulas, formatos de número, colores y celdas combinadas.

```bash
npm run test:excel   # genera /tmp/generado_ts.xlsx desde el dataset de ejemplo
```

## Pendiente / próximas iteraciones

- Afinar el prompt maestro con documentos reales (testing).
- Capturar en la extracción de Gemini los campos extra del formato (partida
  arancelaria, peso, confianza por campo, IGV por gasto).
- Opción de conectar Google Drive (hoy: subida manual).
