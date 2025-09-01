// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true, // <-- allow importing from ../backend/*
  },
};

export default nextConfig;
