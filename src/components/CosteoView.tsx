"use client";

import { CosteoResult } from "@/lib/costeo";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => (n * 100).toFixed(2) + "%";

export default function CosteoView({ costeo }: { costeo: CosteoResult }) {
  const P = costeo.productos;
  if (P.length === 0) {
    return <p className="text-slate-500">Sin productos: revisa la extracción.</p>;
  }

  const Row = ({
    label,
    vals,
    total,
    bg,
    fmtFn = fmt,
    badge,
  }: {
    label: string;
    vals: number[];
    total?: number;
    bg?: string;
    fmtFn?: (n: number) => string;
    badge?: string;
  }) => (
    <tr>
      <td className="whitespace-nowrap font-medium" style={bg ? { background: "#" + bg } : undefined}>
        {label}
        {badge && (
          <span className="ml-1 rounded bg-indigo-100 px-1 text-[10px] font-normal text-indigo-600">
            {badge}
          </span>
        )}
      </td>
      {vals.map((v, i) => (
        <td key={i} className="text-right" style={bg ? { background: "#" + bg } : undefined}>
          {fmtFn(v)}
        </td>
      ))}
      <td className="text-right font-semibold" style={bg ? { background: "#" + bg } : undefined}>
        {total !== undefined ? fmtFn(total) : ""}
      </td>
    </tr>
  );

  const sum = (f: (p: (typeof P)[number]) => number) => P.reduce((s, p) => s + f(p), 0);

  return (
    <div className="overflow-x-auto">
      <table className="tbl tbl-num min-w-max">
        <thead>
          <tr>
            <th>Concepto</th>
            {P.map((p, i) => (
              <th key={i} className="text-right">
                {p.nombre || "Prod " + (i + 1)}
              </th>
            ))}
            <th className="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          <Row label="VALOR EXW" vals={P.map((p) => p.exw)} total={sum((p) => p.exw)} bg="FCE4EC" />
          {costeo.gastos.map((g, gi) => (
            <Row
              key={gi}
              label={g.concepto}
              vals={g.porProducto}
              total={g.montoTotal}
              badge={g.origen === "dua" ? "DUA" : undefined}
            />
          ))}
          <Row label="TOTAL GASTOS $" vals={P.map((p) => p.totalGastosUSD)} total={costeo.totalGastosUSD} bg="FCE4EC" />
          <Row label="VALOR TOTAL $" vals={P.map((p) => p.valorTotalUSD)} total={costeo.totalGeneralUSD} bg="FCE4EC" />
          <Row label="VALOR TOTAL S/" vals={P.map((p) => p.valorTotalSoles)} total={costeo.totalGeneralSoles} bg="FCE4EC" />
          <Row label="CANTIDAD" vals={P.map((p) => p.cantidad)} fmtFn={(n) => String(n)} />
          <Row label="COSTO UNITARIO $" vals={P.map((p) => p.costoUnitUSD)} bg="FFF9C4" />
          <Row label="COSTO UNITARIO S/" vals={P.map((p) => p.costoUnitSoles)} bg="FFF9C4" />
          <Row label="F.I." vals={P.map((p) => p.fi)} bg="D9EAD3" fmtFn={(n) => n.toFixed(4)} />
          <Row label="FACTOR" vals={P.map((p) => p.factor)} fmtFn={pct} />
        </tbody>
      </table>
    </div>
  );
}
