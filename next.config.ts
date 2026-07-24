import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Import .vert / .frag shader files as raw strings.
    config.module.rules.push({
      test: /\.(vert|frag|glsl)$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
