import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Drawing solver is disabled" },
    { status: 503 }
  );
}
}
