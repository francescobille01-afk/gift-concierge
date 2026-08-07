import { NextResponse } from "next/server";
import { isAmazonConfigured, searchItems } from "@/lib/amazonCreators";

/**
 * Diagnostic endpoint for the Amazon Creators API wiring.
 *
 * Deliberately separate from the gift flow: it proves the credentials, the
 * token exchange and the search all work before any of it is put in front of a
 * user. Returns product data only — never the credentials, and never the raw
 * client id or secret in an error.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAmazonConfigured()) {
    return NextResponse.json({
      ok: false,
      step: "credentials",
      message: "AMAZON_CREATORS_CLIENT_ID / AMAZON_CREATORS_CLIENT_SECRET are not set in .env.local",
    }, { status: 503 });
  }

  try {
    const items = await searchItems({
      keywords: "zaino da trekking",
      minPrice: 40,
      maxPrice: 130,
      itemCount: 3,
    });

    return NextResponse.json({
      ok: true,
      found: items.length,
      items: items.map(item => ({
        asin: item.asin,
        title: item.title,
        price: item.price,
        hasImage: Boolean(item.imageUrl),
        url: item.url,
        // Proves the partner tag is being applied — without it we earn nothing.
        taggedForUs: item.url.includes("gifty0de-21"),
      })),
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      step: "request",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 502 });
  }
}
