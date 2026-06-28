import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/product-image?q={imageSearchQuery}
 *
 * Redirects to an Unsplash photo matching the search query.
 * Uses the Unsplash Source URL — no API key required, always works.
 *
 * Claude provides a specific imageSearchQuery per gift (e.g. "tatcha skincare mist bottle beauty")
 * so each card gets a visually relevant, distinct photo.
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "gift product";

  // Clean and encode the query for Unsplash
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .replace(/\s+/g, ",");

  // Unsplash Source — returns a featured photo matching the keywords.
  // Each unique keyword string consistently returns a different photo,
  // so distinct gifts get distinct images.
  const url = `https://source.unsplash.com/featured/600x400/?${encodeURIComponent(cleaned)}`;

  return NextResponse.redirect(url, { status: 302 });
}
