import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Video proxy route — streams /media/... from the backend over the same origin
 * so the <video> element can make Range requests without cross-origin issues.
 *
 * Usage: /api/video-proxy/videos/UUID.mp4
 *   → proxies → http://localhost:8000/media/videos/UUID.mp4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const backendUrl = `${BACKEND_URL}/media/${path.join("/")}`;

  const upstreamHeaders: HeadersInit = {};
  const range = request.headers.get("range");
  if (range) upstreamHeaders["Range"] = range;

  try {
    const upstream = await fetch(backendUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse(null, { status: upstream.status });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("Content-Range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
