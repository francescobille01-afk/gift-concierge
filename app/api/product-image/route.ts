import { NextRequest, NextResponse } from "next/server";

function svgPlaceholder(q: string): NextResponse {
  let h = 0;
  for (let i = 0; i < q.length; i++) h = (h * 31 + q.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const c1 = `hsl(${hue},38%,82%)`;
  const c2 = `hsl(${(hue + 28) % 360},42%,68%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="600" height="400" fill="url(#g)"/>
    <g transform="translate(300,200)" opacity="0.55">
      <rect x="-38" y="-14" width="76" height="58" rx="6" fill="#5e2e2e"/>
      <rect x="-44" y="-30" width="88" height="20" rx="6" fill="#5e2e2e"/>
      <rect x="-6" y="-30" width="12" height="74" fill="#c9a26b"/>
      <path d="M -6 -30 C -30 -52, -50 -34, -28 -22 Z" fill="#c9a26b"/>
      <path d="M 6 -30 C 30 -52, 50 -34, 28 -22 Z" fill="#c9a26b"/>
    </g>
  </svg>`;
  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "gift";
  return svgPlaceholder(q);
}
