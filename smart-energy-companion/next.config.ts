import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (avoids the multi-lockfile warning).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
