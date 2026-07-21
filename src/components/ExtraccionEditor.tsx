"use client";

import { DatosOC, Gasto, Producto } from "@/lib/types";

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
      className="cell-edit w-full rounded px-1 py-0.5 outline-none"
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
        { nombre: "", codigo: "", cantidad: 0, precio_unit: 0, exw_total: 0 },
      ],
    });
  const delProducto = (i: number) =>
    onChange({ ...datos, productos: datos.productos.filter((_, idx) => idx !== i) });

  const setGasto = (i: number, k: keyof Gasto, v: string | number) => {
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
        },
      ],
    });
  const delGasto = (i: number) =>
    onChange({ ...datos, gastos: datos.gastos.filter((_, idx) => idx !== i) });

  const f = datos.factura;
  const d = datos.dua;

  return (
    <div className="space-y-8">
      <p className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
        ⚠ Las celdas en amarillo son editables. Corrige lo que Gemini haya extraído mal;
        el costeo se recalcula solo.
      </p>

      {/* DATOS GENERALES */}
      <section>
        <h3 className="mb-2 font-semibold text-slate-700">Datos generales</h3>
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
          <h3 className="font-semibold text-slate-700">Productos ({datos.productos.length})</h3>
          <button onClick={addProducto} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="w-1/3">Nombre</th>
                <th>Código</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th>EXW total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datos.productos.map((p, i) => (
                <tr key={i}>
                  <td className="cell-edit"><Edit value={p.nombre} onChange={(v) => setProducto(i, "nombre", v)} /></td>
                  <td className="cell-edit"><Edit value={p.codigo} onChange={(v) => setProducto(i, "codigo", v)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.cantidad} onChange={(v) => setProducto(i, "cantidad", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.precio_unit} onChange={(v) => setProducto(i, "precio_unit", parseFloat(v) || 0)} /></td>
                  <td className="cell-edit"><Edit numeric value={p.exw_total} onChange={(v) => setProducto(i, "exw_total", parseFloat(v) || 0)} /></td>
                  <td className="text-center">
                    <button onClick={() => delProducto(i)} className="text-red-500">✕</button>
                  </td>
                </tr>
              ))}
              {datos.productos.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400">Sin productos detectados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* GASTOS */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Gastos de importación ({datos.gastos.length})</h3>
          <button onClick={addGasto} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">
            + Agregar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Sección</th>
                <th>Concepto</th>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Serie/Nro</th>
                <th>Moneda</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {datos.gastos.map((g, i) => (
                <tr key={i}>
                  <td className="cell-edit"><Edit value={g.seccion} onChange={(v) => setGasto(i, "seccion", v)} /></td>
                  <td className="cell-edit"><Edit value={g.concepto} onChange={(v) => setGasto(i, "concepto", v)} /></td>
                  <td className="cell-edit"><Edit value={g.fecha} onChange={(v) => setGasto(i, "fecha", v)} /></td>
                  <td className="cell-edit"><Edit value={g.proveedor} onChange={(v) => setGasto(i, "proveedor", v)} /></td>
                  <td className="cell-edit"><Edit value={g.tipo_comprobante} onChange={(v) => setGasto(i, "tipo_comprobante", v)} /></td>
                  <td className="cell-edit"><Edit value={g.serie_numero} onChange={(v) => setGasto(i, "serie_numero", v)} /></td>
                  <td className="cell-edit"><Edit value={g.moneda} onChange={(v) => setGasto(i, "moneda", v)} /></td>
                  <td className="cell-edit"><Edit numeric value={g.monto} onChange={(v) => setGasto(i, "monto", parseFloat(v) || 0)} /></td>
                  <td className="text-center">
                    <button onClick={() => delGasto(i)} className="text-red-500">✕</button>
                  </td>
                </tr>
              ))}
              {datos.gastos.length === 0 && (
                <tr><td colSpan={9} className="text-center text-slate-400">Sin gastos detectados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
