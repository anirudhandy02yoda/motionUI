import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @remotion/bundler and @remotion/renderer ship native/binary assets (esbuild,
  // headless Chromium) that must not be processed by Next's webpack bundling.
  serverExternalPackages: ["@remotion/bundler", "@remotion/renderer", "@remotion/tailwind-v4"],
};

export default nextConfig;
