/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // exceljs es una dependencia pesada usada solo en el servidor / cliente bajo demanda
    serverComponentsExternalPackages: ["exceljs"],
  },
};

export default nextConfig;
