/** @type {import('next').NextConfig} */

// Base path en GitHub Pages (tsdonoso-beep.github.io/<repo>/).
// En GitHub Actions, GITHUB_REPOSITORY = "owner/repo": derivamos el nombre real
// del repo automáticamente, así renombrar el repo NO requiere tocar el código.
const isProd = process.env.NODE_ENV === "production";
const repoFromCI = process.env.GITHUB_REPOSITORY?.split("/")[1];
const repo = repoFromCI || "PLATAFORMA-DE-NALDI";
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
