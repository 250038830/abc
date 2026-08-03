/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/abc',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
