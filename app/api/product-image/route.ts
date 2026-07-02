import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractOgImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1] && m[1].startsWith("http")) return m[1].trim();
  }
  return null;
}

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
  const url = req.nextUrl.searchParams.get("url");
  const q = req.nextUrl.searchParams.get("q") ?? "gift";

  if (!url) return svgPlaceholder(q);

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });

    if (!res.ok) return svgPlaceholder(q);

    const html = await res.text();
    const imageUrl = extractOgImage(html);

    if (!imageUrl) return svgPlaceholder(q);

    // Redirect the browser to fetch the image directly (avoids proxying large images)
    return NextResponse.redirect(imageUrl, { status: 302 });
  } catch {
    return svgPlaceholder(q);
  }
}
