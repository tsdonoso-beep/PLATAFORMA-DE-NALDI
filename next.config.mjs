/** @type {import('next').NextConfig} */

// Nombre del repo → base path en GitHub Pages (tsdonoso-beep.github.io/<repo>/).
const repo = "PLATAFORMA-DE-NALDI";
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? `/${repo}` : "";

const nextConfig = {
  // Export estático: genera HTML/JS en /out, alojable en GitHub Pages.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // Disponible en el cliente para prefijar assets del /public (logo).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
