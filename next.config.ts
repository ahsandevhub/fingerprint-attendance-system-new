import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/log-id", destination: "/api/log-id" },
      { source: "/new-id", destination: "/api/new-id" },
      { source: "/updateOnNewFinger", destination: "/api/updateOnNewFinger" },
      { source: "/heartbeat", destination: "/api/heartbeat" },
      { source: "/match-fingerprint", destination: "/api/match-fingerprint" },
      { source: "/enroll-template", destination: "/api/enroll-template" },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
