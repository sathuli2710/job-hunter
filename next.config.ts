import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only rewrite in development to point to local Express backend on port 5000
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:5050/api/:path*",
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
