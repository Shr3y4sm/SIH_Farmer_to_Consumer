import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@farmit/domain", "@farmit/pricing", "@farmit/validation", "@farmit/translations"],
};

export default nextConfig;