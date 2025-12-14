
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
       {
        protocol: "https",
        hostname: "media3.giphy.com",
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Increase the timeout to allow for video generation
  serverActions: {
    bodySizeLimit: '2mb',
  },
};

module.exports = nextConfig;
