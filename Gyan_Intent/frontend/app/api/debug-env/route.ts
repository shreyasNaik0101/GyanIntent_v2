import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    BACKEND_URL: process.env.BACKEND_URL || "NOT SET",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
