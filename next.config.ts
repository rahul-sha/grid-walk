import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old Results, Positions and About pages were folded into Grid
  // Walk's cards; send any saved links to the home page instead of a 404.
  async redirects() {
    return [
      { source: "/results", destination: "/", permanent: true },
      { source: "/positions", destination: "/", permanent: true },
      { source: "/about", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
