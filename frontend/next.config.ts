import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  outputFileTracingIncludes: {
    '/api/*': ['./content/**/*.md', './data/twin/*'],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
