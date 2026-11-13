/** @type {import('next').NextConfig} */
const nextConfig = {
  // Las fotos se achican en el celular antes de subir, pero dejamos margen.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default nextConfig;
