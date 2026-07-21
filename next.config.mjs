/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // pdf-parse e mammoth usam require dinâmico / APIs de Node; mantê-los fora do
  // bundle do webpack evita erros de build e de runtime nas rotas de API.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
};

export default nextConfig;
