import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  // Standalone output for Docker containerization
  output: "standalone",

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // React strict mode catches bugs early
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Allow Supabase storage images in Next.js Image component
  images: {
    remotePatterns: [
      // Local Supabase (Docker)
      { protocol: "http", hostname: "127.0.0.1", port: "54421" },
      // Supabase Cloud (production)
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
    ],
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);