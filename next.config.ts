import type { NextConfig } from "next";

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
  /* ─── Production Deployment ──────────────────────────── */

  // Standalone output for Docker containerization
  output: "standalone",

  /* ─── Dev Performance Optimizations ──────────────────────────── */

  // Turbopack is the default bundler in Next.js 16 dev mode — no config needed.

  // Disable dev indicators for cleaner terminal output
  devIndicators: false,

  // Production optimizations
  compress: true,

  // React strict mode catches bugs early
  reactStrictMode: true,

  // Remove X-Powered-By header for security
  poweredByHeader: false,

  // Security headers for production
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Server external packages — don't bundle these, load from node_modules
  serverExternalPackages: ["@supabase/supabase-js"],

  // Allow Supabase storage images in Next.js Image component
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Local Supabase (Docker)
      { protocol: "http", hostname: "127.0.0.1", port: "54421" },
      // Supabase Cloud (production)
      { protocol: "https", hostname: "**.supabase.co" },
      // Unsplash images (seed/demo data)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Tree-shake barrel imports — dramatically reduces client bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
      "date-fns",
    ],
  },
};

export default nextConfig;
