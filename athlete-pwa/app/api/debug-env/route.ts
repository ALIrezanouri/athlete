// TEMPORARY DEBUG ENDPOINT — DELETE AFTER DIAGNOSIS
// Visit: https://your-app.vercel.app/api/debug-env
// This will show which env vars are actually available at runtime

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    envVars: {
      // Server-side (secret) vars
      DEV_OTP: process.env.DEV_OTP ? `SET (${process.env.DEV_OTP.length} chars)` : "❌ NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `SET (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : "❌ NOT SET",
      
      // Public (client) vars
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `SET (${process.env.NEXT_PUBLIC_SUPABASE_URL})` : "❌ NOT SET",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? `SET (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length} chars)` : "❌ NOT SET",
      NEXT_PUBLIC_DEV_OTP_HINT: process.env.NEXT_PUBLIC_DEV_OTP_HINT ? `SET` : "❌ NOT SET",
    },
    diagnosis: process.env.DEV_OTP
      ? "✅ DEV_OTP is set — login should work in dev mode"
      : "❌ DEV_OTP is NOT set — Vercel env var issue. Check: 1) Environment=Production selected, 2) Redeploy after adding",
  })
}