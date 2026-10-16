import { GETIMG_IMAGE_HOST, BLOB_IMAGE_HOST } from './src/app/constans/imageHosts.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: GETIMG_IMAGE_HOST,
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: BLOB_IMAGE_HOST,
        port: '',
        pathname: '/**',
      },
    ],
  },
  // output: 'export'
};

export default nextConfig;