/**
 * Amazon Creators API client (amazon.it).
 *
 * Replaces PA-API 5, which Amazon has deprecated — it now answers 403 and tells
 * you to migrate here. Access needs an approved Associates account with at
 * least 10 qualifying sales in the last 30 days.
 *
 * ── What we are allowed to keep, per the Creators API licence ──
 * Images   never stored. We keep the URL only, and only for up to 24h.
 * Prices   1 hour, per Amazon's own best-practice guidance.
 * Titles,  24h, then they must be fetched again.
 * features
 * ASINs    indefinitely — the one thing safe to persist.
 * So anything long-lived on our side (favourites) stores the ASIN and nothing
 * else; the rest is re-fetched when it is shown.
 */

const TOKEN_ENDPOINT = "https://api.amazon.co.uk/auth/o2/token"; // EU region
const API_HOST = "https://creatorsapi.amazon";
const MARKETPLACE = "www.amazon.it";
const PARTNER_TAG = "gifty0de-21";

/** Refresh this long before the hour is up, so a call never races expiry. */
const TOKEN_SKEW_MS = 5 * 60 * 1000;

export interface AmazonItem {
  asin: string;
  title: string;
  /** Amazon's detail page, already carrying our partner tag. */
  url: string;
  /** Hotlinked, never downloaded — see the licence note above. */
  imageUrl?: string;
  /** Display string as Amazon formats it, e.g. "34,99 €". */
  price?: string;
  priceAmount?: number;
  currency?: string;
  features?: string[];
  available?: boolean;
  /** When this price was read, so the UI can say so. */
  fetchedAt: number;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function credentials(): { id: string; secret: string } | null {
  const id = process.env.AMAZON_CREATORS_CLIENT_ID;
  const secret = process.env.AMAZON_CREATORS_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

/** True when the API is configured — lets callers fall back quietly. */
export function isAmazonConfigured(): boolean {
  return credentials() !== null;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_SKEW_MS) {
    return cachedToken.value;
  }
  const creds = credentials();
  if (!creds) throw new Error("Amazon Creators API credentials are not set");

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.id,
      client_secret: creds.secret,
      scope: "creatorsapi::default",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Amazon token request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function callApi(operation: string, body: Record<string, unknown>): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${API_HOST}/catalog/v1/${operation}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-marketplace": MARKETPLACE,
    },
    body: JSON.stringify({ marketplace: MARKETPLACE, partnerTag: PARTNER_TAG, ...body }),
  });

  if (!res.ok) {
    const text = await res.text();
    // A stale token is the one failure worth retrying blind.
    if (res.status === 401) cachedToken = null;
    throw new Error(`Amazon ${operation} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

const RESOURCES = [
  "images.primary.large",
  "itemInfo.title",
  "itemInfo.features",
  "offersV2.listings.price",
  "offersV2.listings.availability",
];

/* The exact response shape isn't pinned down in the public docs, so read it
   defensively: every field is optional and a missing one costs us a detail,
   never the whole result. */
function parseItem(raw: any): AmazonItem | null {
  const asin = raw?.asin ?? raw?.ASIN;
  if (!asin) return null;

  const listing = raw?.offersV2?.listings?.[0] ?? raw?.offers?.listings?.[0];
  const price = listing?.price;

  return {
    asin,
    title: raw?.itemInfo?.title?.displayValue ?? raw?.itemInfo?.title?.DisplayValue ?? "",
    url: raw?.detailPageURL ?? raw?.detailPageUrl ?? `https://www.amazon.it/dp/${asin}?tag=${PARTNER_TAG}`,
    imageUrl: raw?.images?.primary?.large?.url ?? raw?.images?.primary?.large?.URL,
    price: price?.displayAmount ?? price?.DisplayAmount,
    priceAmount: price?.amount ?? price?.Amount,
    currency: price?.currency ?? price?.Currency,
    features: raw?.itemInfo?.features?.displayValues ?? raw?.itemInfo?.features?.DisplayValues,
    available: listing?.availability?.type ? listing.availability.type === "Now" : undefined,
    fetchedAt: Date.now(),
  };
}

export interface SearchOptions {
  keywords: string;
  /** Euros, inclusive. Converted to cents — the API works in the smallest unit. */
  minPrice?: number;
  maxPrice?: number;
  itemCount?: number;
  searchIndex?: string;
  sortBy?: "Relevance" | "Price:LowToHigh" | "Price:HighToLow" | "NewestArrivals" | "AvgCustomerReviews" | "Featured";
  minReviewsRating?: number;
}

/** Find real listings for a product description. */
export async function searchItems(options: SearchOptions): Promise<AmazonItem[]> {
  const body: Record<string, unknown> = {
    keywords: options.keywords,
    itemCount: Math.min(10, Math.max(1, options.itemCount ?? 3)),
    searchIndex: options.searchIndex ?? "All",
    resources: RESOURCES,
    currencyOfPreference: "EUR",
    languagesOfPreference: ["it_IT"],
    availability: "Available",
  };
  if (options.minPrice !== undefined) body.minPrice = Math.round(options.minPrice * 100);
  if (options.maxPrice !== undefined) body.maxPrice = Math.round(options.maxPrice * 100);
  if (options.sortBy) body.sortBy = options.sortBy;
  if (options.minReviewsRating) body.minReviewsRating = options.minReviewsRating;

  const data = await callApi("searchItems", body);
  const items = data?.searchResult?.items ?? data?.SearchResult?.Items ?? [];
  return items.map(parseItem).filter((item: AmazonItem | null): item is AmazonItem => item !== null);
}

/** Re-read known products by ASIN — this is how a saved favourite gets its
 *  current price and image back without us having stored either. */
export async function getItems(asins: string[]): Promise<AmazonItem[]> {
  if (!asins.length) return [];
  const data = await callApi("getItems", {
    itemIds: asins.slice(0, 10),
    itemIdType: "ASIN",
    resources: RESOURCES,
    currencyOfPreference: "EUR",
    languagesOfPreference: ["it_IT"],
  });
  const items = data?.itemsResult?.items ?? data?.ItemsResult?.Items ?? [];
  return items.map(parseItem).filter((item: AmazonItem | null): item is AmazonItem => item !== null);
}
