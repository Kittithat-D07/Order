/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // เปิดให้ build fail เมื่อมี type error
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
