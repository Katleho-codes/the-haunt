import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Docker image sets NEXT_OUTPUT=standalone to produce a small self-contained server (see Dockerfile).
  // Normal `npm run build` / `npm start` keep the default output so local development and the e2e scripts are unchanged.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
