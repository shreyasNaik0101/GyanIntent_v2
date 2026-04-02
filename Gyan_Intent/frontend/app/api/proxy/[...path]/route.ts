import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = new URL(`/api/v1/${pathString}`, BACKEND_URL);
  
  // Copy query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json(
        { error: text || "Backend returned non-JSON response" },
        { status: response.status }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Backend connection failed. Is the backend server running?" },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = new URL(`/api/v1/${pathString}`, BACKEND_URL);

  try {
    const body = await request.json();
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json(
        { error: text || "Backend returned non-JSON response" },
        { status: response.status }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Backend connection failed. Is the backend server running?" },
      { status: 502 }
    );
  }
}
