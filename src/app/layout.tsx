import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Costeo OC — Extractor de Importaciones",
  description: "Lee documentos de importación y arma el costeo de una OC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
