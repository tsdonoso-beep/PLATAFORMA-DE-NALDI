"use client";

import { DatosOC, Gasto, Producto } from "@/lib/types";
import { facturaEnEurConvertible } from "@/lib/costeo";

interface Props {
  datos: DatosOC;
  onChange: (d: DatosOC) => void;
}

// Input editable reutilizable con fondo amarillo (celda corregible).
function Edit({
  value,
  onChange,
  numeric,
}: {
  value: string | number;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <input
      className={`cell-edit w-full rounded px-1 py-0.5 outline-none ${numeric ? "font-mono-num text-right" : ""}`}
      type={numeric ? "number" : "text"}
      step="any"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function ExtraccionEditor({ datos, onChange }: Props) {
  const setFactura = (k: string, v: string | number) =>
    onChange({ ...datos, factura: { ...datos.factura, [k]: v } });
  const setDua = (k: string, v: number) =>
    onChange({ ...datos, dua: { ...datos.dua, [k]: v } });

  const setProducto = (i: number, k: keyof Producto, v: string | number) => {
    const productos = datos.productos.map((p, idx) =>
      idx === i ? { ...p, [k]: v } : p
    );
    onChange({ ...datos, productos });
  };
  const addProducto = () =>
    onChange({
      ...datos,
      productos: [
        ...datos.productos,
        { nombre: "", codigo: "", cantidad: 0, precio_unit: 0, exw_total: 0, partida: "", peso: "", confianza: "alta" },
      ],
    });
  const delProducto = (i: number) =>
    onChange({ ...datos, productos: datos.productos.filter((_, idx) => idx !== i) });

  const setGasto = (i: number, k: keyof Gasto, v: string | number | boolean) => {
    const gastos = datos.gastos.map((g, idx) => (idx === i ? { ...g, [k]: v } : g));
    onChange({ ...datos, gastos });
  };
  const addGasto = () =>
    onChange({
      ...datos,
      gastos: [
        ...datos.gastos,
        {
          seccion: "",
          concepto: "",
          fecha: "",
          proveedor: "",
          tipo_comprobante: "FACTURA",
          serie_numero: "",
          moneda: "DÓLARES",
          monto: 0,
          igv: 0,
          incluido: true,
          origen: "documento",
          confianza: "alta",
        },
      ],
    });
  const delGasto = (i: number) =>
    onChange({ ...datos, gastos: datos.gastos.filter((_, idx) => idx !== i) });

  const f = datos.factura;
  const d = datos.dua;

  return (
    <div className="space-y-8">
      <p className="rounded-lg border border-[var(--line-strong)] bg-[var(--edit)] px-3 py-2 text-sm text-[var(--ink-2)]">
        ⚠ Las celdas en <span className="rounded bg-white/60 px-1">amarillo</span> son editables.
        Corrige lo que Gemini haya extraído mal; el costeo se recalcula solo. El punto{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" /> /{" "}
        <span className="inline-block h-2 w-2 rounded-full bg-red-400 align-middle" /> marca datos de
        confianza media / baja.
      </p>

      {(datos.factura.moneda || "").toUpperCase() === "EUR" && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          💶 Factura en EUR.{" "}
          {facturaEnEurConvertible(datos)
            ? "El EXW se convierte a USD (TC EUR ÷ TC USD) para el costeo en dólares."
            : "Ingresa TC USD y TC EUR para convertir el EXW a dólares; si no, el costeo tratará el EXW como USD."}
        </p>
      )}

      {/* DATOS GENERALES */}
      <section>
        <h3 className="mb-3 text-base font-semibold text-[var(--ink)]">Datos generales</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="TC USD (soles/dólar)">
            <Edit numeric value={d.tc_usd ?? ""} onChange={(v) => setDua("tc_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="TC EUR (soles/euro)">
            <Edit numeric value={datos.tc_eur} onChange={(v) => onChange({ ...datos, tc_eur: parseFloat(v) || 0 })} />
          </Field>
          <Field label="DUA / Ref. Courier">
            <Edit value={d.numero ?? ""} onChange={(v) => onChange({ ...datos, dua: { ...d, numero: v } })} />
          </Field>
          <Field label="Proveedor">
            <Edit value={f.proveedor} onChange={(v) => setFactura("proveedor", v)} />
          </Field>
          <Field label="N° Factura(s)">
            <Edit value={f.numero_factura} onChange={(v) => setFactura("numero_factura", v)} />
          </Field>
          <Field label="Moneda Factura">
            <Edit value={f.moneda} onChange={(v) => setFactura("moneda", v)} />
          </Field>
          <Field label="N° Orden de Compra">
            <Edit value={f.numero_oc} onChange={(v) => setFactura("numero_oc", v)} />
          </Field>
          <Field label="Proyecto">
            <Edit value={datos.proyecto} onChange={(v) => onChange({ ...datos, proyecto: v })} />
          </Field>
          <Field label="Título OC (desaduanaje)">
            <Edit value={datos.oc_titulo} onChange={(v) => onChange({ ...datos, oc_titulo: v })} />
          </Field>
          <Field label="Periodo">
            <Edit numeric value={datos.periodo} onChange={(v) => onChange({ ...datos, periodo: parseInt(v) || new Date().getFullYear() })} />
          </Field>
          <Field label="Tipo de carga">
            <Edit value={datos.tipo_carga} onChange={(v) => onChange({ ...datos, tipo_carga: v })} />
          </Field>
          <Field label="FOB USD">
            <Edit numeric value={d.fob_usd ?? 0} onChange={(v) => setDua("fob_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="Flete USD (DUA)">
            <Edit numeric value={d.flete_usd ?? 0} onChange={(v) => setDua("flete_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="Seguro USD">
            <Edit numeric value={d.seguro_usd ?? 0} onChange={(v) => setDua("seguro_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="AD-VALOREM USD">
            <Edit numeric value={d.ad_valorem_usd ?? 0} onChange={(v) => setDua("ad_valorem_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="IPM USD">
            <Edit numeric value={d.ipm_usd ?? 0} onChange={(v) => setDua("ipm_usd", parseFloat(v) || 0)} />
          </Field>
          <Field label="IGV USD">
            <Edit numeric value={d.igv_usd ?? 0} onChange={(v) => setDua("igv_usd", parseFloat(v) || 0)} />
          </Field>
        </div>
      </section>

      {/* PRODUCTOS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--ink)]">Productos ({datos.productos.length})</h3>
          <button onClick={addProducto} className="btn btn-ghost px-2.5 py-1 text-xs">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-1/4">Nombre</th>
                <th>Código</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th>EXW total</th>
                <th>Partida</th>
                <th>Peso (kg)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datos.productos.map((p, i) => (
                <tr key={i}>
                  <td className="cell-edit">
                    <div className="flex items-center gap-1">
                      <ConfBadge conf={p.confianza} />
                      <Edit value={p.nombre} onChange={(v) => setProducto(i, "nombre", v)} />
                    </div>
                  </td>
                  <td className="cell-edit"><Edit value={p.codigo} onChange={(v) => setProducto(i, "codigo", v)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.cantidad} onChange={(v) => setProducto(i, "cantidad", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.precio_unit} onChange={(v) => setProducto(i, "precio_unit", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.exw_total} onChange={(v) => setProducto(i, "exw_total", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit value={p.partida || ""} onChange={(v) => setProducto(i, "partida", v)} /></td>
                  <td className="cell-edit"><Edit value={p.peso || ""} onChange={(v) => setProducto(i, "peso", v)} /></td>
                  <td className="text-center">
                    <button onClick={() => delProducto(i)} className="text-red-500">✕</button>
                  </td>
                </tr>
              ))}
              {datos.productos.length === 0 && (
                <tr><td colSpan={8} className="text-center text-slate-400">Sin productos detectados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* GASTOS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--ink)]">Gastos de importación ({datos.gastos.length})</h3>
          <button onClick={addGasto} className="btn btn-ghost px-2.5 py-1 text-xs">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th title="Incluir en el costeo">✓</th>
                <th>Sección</th>
                <th>Concepto</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Serie/Nro</th>
                <th>Moneda</th>
                <th>Monto</th>
                <th>IGV</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datos.gastos.map((g, i) => {
                const incluido = g.incluido !== false;
                return (
                <tr key={i} className={incluido ? "" : "opacity-40"}>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={incluido}
                      onChange={(e) => setGasto(i, "incluido", e.target.checked)}
                    />
                  </td>
                  <td className="cell-edit">
                    <div className="flex items-center gap-1">
                      <ConfBadge conf={g.confianza} />
                      <Edit value={g.seccion} onChange={(v) => setGasto(i, "seccion", v)} />
                      {g.origen === "dua" && (
                        <span className="rounded bg-indigo-100 px-1 text-[10px] text-indigo-600">DUA</span>
                      )}
                    </div>
                  </td>
                  <td className="cell-edit"><Edit value={g.concepto} onChange={(v) => setGasto(i, "concepto", v)} /></td>
                  <td className="cell-edit"><Edit value={g.fecha} onChange={(v) => setGasto(i, "fecha", v)} /></td>
                  <td className="cell-edit"><Edit value={g.proveedor} onChange={(v) => setGasto(i, "proveedor", v)} /></td>
                  <td className="cell-edit"><Edit value={g.tipo_comprobante} onChange={(v) => setGasto(i, "tipo_comprobante", v)} /></td>
                  <td className="cell-edit"><Edit value={g.serie_numero} onChange={(v) => setGasto(i, "serie_numero", v)} /></td>
                  <td className="cell-edit"><Edit value={g.moneda} onChange={(v) => setGasto(i, "moneda", v)} /></td>
                  <td className="cell-edit"><Edit numeric value={g.monto} onChange={(v) => setGasto(i, "monto", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit numeric value={g.igv ?? 0} onChange={(v) => setGasto(i, "igv", parseFloat(v) || 0)} /></td>
                  <td className="text-center">
                    <button onClick={() => delGasto(i)} className="text-red-500">✕</button>
                  </td>
                </tr>
                );
              })}
              {datos.gastos.length === 0 && (
                <tr><td colSpan={11} className="text-center text-slate-400">Sin gastos detectados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Punto de color según la confianza reportada por Gemini (semáforo).
function ConfBadge({ conf }: { conf?: string }) {
  if (!conf || conf === "alta") return null;
  const color = conf === "baja" ? "bg-red-400" : "bg-amber-400";
  return (
    <span
      title={"Confianza " + conf + " — revisar este dato"}
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-2">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
