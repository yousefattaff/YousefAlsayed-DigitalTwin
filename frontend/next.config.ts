import type { NextConfig } from "next";

const allowedDevOrigins = ['127.0.0.1'];
if (process.env.FIGMA && process.env.FIGMA_PUBLIC_URL) {
  try {
    allowedDevOrigins.push(new URL(process.env.FIGMA_PUBLIC_URL).host);
  } catch {
    // Ignore invalid URL
  }
}

const nextConfig: NextConfig = {
  ...(process.env.FIGMA ? { output: 'standalone' as const } : {}),
  allowedDevOrigins,
  outputFileTracingIncludes: {
    '/api/*': ['./content/**/*.md', './data/twin/*'],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
