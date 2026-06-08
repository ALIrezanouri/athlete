import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const health: Record<string, string> = {
    status: "ok",
    service: "adminpanel",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    version: process.env.npm_package_version || "0.1.0",
    supabase: "unknown",
  };

  // Check Supabase connectivity
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      health.status = "degraded";
      health.supabase = "not configured";
    } else {
      health.supabase = "configured";
    }
  } catch {
    health.status = "degraded";
    health.supabase = "error";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}