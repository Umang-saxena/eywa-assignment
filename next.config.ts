import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/src/:path*',
        destination: '/404',
      },
      {
        source: '/_next/src/:path*',
        destination: '/404',
      },
    ];
  },
};

export default nextConfig;
