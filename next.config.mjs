/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/abc',
  assetPrefix: '/abc/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
