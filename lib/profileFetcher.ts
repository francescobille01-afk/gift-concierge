/**
 * Fetches social profiles and extracts gift-relevant signals.
 * - Instagram & TikTok → Apify (real data: posts, captions, hashtags, locations)
 * - Pinterest, Amazon, websites → direct HTTP fetch
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

/* ─── Apify: Instagram ─────────────────────────────────────────── */

function extractUsername(url: string): string {
  // handles instagram.com/username, instagram.com/username/, @username
  const m = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)
         || url.match(/^@?([A-Za-z0-9_.]+)$/);
  return m?.[1] ?? "";
}

// NOTE (2026-07-01): switched from apify/instagram-profile-scraper to apify/instagram-scraper.
// The old actor only ever returned bio + follower counts — no post content at all, so every
// "captions / hashtags / locations" section below was silently empty on every run. This actor
// actually reads posts. We make two small calls: one for profile bio/followers ("details"),
// one for the last ~12 posts with real captions/hashtags/locations ("posts"). Cost is roughly
// $0.003 (details) + ~$0.03 (12 posts) = ~3.5 cents per lookup on the free plan.
async function fetchInstagramViaApify(rawUrl: string): Promise<string> {
  if (!APIFY_TOKEN) return "(Apify token not set — Instagram not read)";

  const username = extractUsername(rawUrl);
  if (!username) return "(Could not extract Instagram username from URL)";

  const profileUrl = `https://www.instagram.com/${username}/`;
  const base =
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items` +
    `?token=${APIFY_TOKEN}&timeout=55`;

  const runInput = (resultsType: "details" | "posts", resultsLimit: number) =>
    fetch(base, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ directUrls: [profileUrl], resultsType, resultsLimit }),
      signal:  AbortSignal.timeout(55_000),
    }).catch((err) => {
      // Return a fake failed Response-like so Promise.all doesn't reject the whole pair
      return { ok: false, status: 0, _err: err } as unknown as Response;
    });

  const [detailsRes, postsRes] = await Promise.all([
    runInput("details", 1),
    runInput("posts", 12),
  ]);

  if (!detailsRes.ok && !postsRes.ok) {
    return `(Apify Instagram scraper error: HTTP ${detailsRes.status}/${postsRes.status})`;
  }

  const lines: string[] = [`=== INSTAGRAM: @${username} ===`];

  // Profile info: bio, followers, post count
  if (detailsRes.ok) {
    const detailsData = await detailsRes.json() as Record<string, unknown>[];
    const p = detailsData?.[0] as {
      fullName?:       string;
      biography?:      string;
      followersCount?: number;
      postsCount?:     number;
    } | undefined;
    if (p?.fullName)       lines.push(`Name: ${p.fullName}`);
    if (p?.biography)      lines.push(`Bio: ${p.biography}`);
    if (p?.followersCount) lines.push(`Followers: ${p.followersCount.toLocaleString()}`);
    if (p?.postsCount)     lines.push(`Total posts: ${p.postsCount}`);
  }

  // Real posts: captions, hashtags, locations, likes
  if (postsRes.ok) {
    const posts = await postsRes.json() as {
      caption?:      string;
      hashtags?:     string[];
      locationName?: string;
      likesCount?:   number;
    }[];

    const captions = posts
      .map(post => post.caption)
      .filter((c): c is string => Boolean(c))
      .slice(0, 15);
    if (captions.length) {
      lines.push(`\nRecent post captions:\n- ${captions.join("\n- ")}`);
    }

    const hashtags = [
      ...new Set(posts.flatMap(post => post.hashtags ?? [])),
    ].slice(0, 40);
    if (hashtags.length) {
      lines.push(`\nHashtags used: #${hashtags.join(", #")}`);
    }

    const locations = [
      ...new Set(
        posts.map(post => post.locationName).filter((l): l is string => Boolean(l))
      ),
    ].slice(0, 15);
    if (locations.length) {
      lines.push(`\nLocations tagged: ${locations.join(", ")}`);
    }

    const topPosts = [...posts]
      .sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0))
      .slice(0, 5)
      .map(post => post.caption)
      .filter((c): c is string => Boolean(c));
    if (topPosts.length) {
      lines.push(`\nMost-liked post captions:\n- ${topPosts.join("\n- ")}`);
    }
  }

  if (lines.length === 1) return "(No Instagram data returned by Apify)";
  return lines.join("\n");
}

/* ─── Apify: TikTok ────────────────────────────────────────────── */

function extractTikTokUsername(url: string): string {
  const m = url.match(/tiktok\.com\/@([A-Za-z0-9_.]+)/i)
         || url.match(/^@?([A-Za-z0-9_.]+)$/);
  return m?.[1] ?? "";
}

async function fetchTikTokViaApify(rawUrl: string): Promise<string> {
  if (!APIFY_TOKEN) return "(Apify token not set — TikTok not read)";

  const username = extractTikTokUsername(rawUrl);
  if (!username) return "(Could not extract TikTok username from URL)";

  const profileUrl = `https://www.tiktok.com/@${username}`;

  const endpoint =
    `https://api.apify.com/v2/acts/clockworks~tiktok-profile-scraper/run-sync-get-dataset-items` +
    `?token=${APIFY_TOKEN}&timeout=90`;

  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      profiles:       [profileUrl],
      resultsPerPage: 12,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) return `(Apify TikTok scraper error: HTTP ${res.status})`;

  const data = await res.json() as Record<string, unknown>[];
  if (!data?.length) return "(No TikTok data returned by Apify)";

  const lines: string[] = [`=== TIKTOK: @${username} ===`];

  // Profile info is usually on the first item
  const profile = data[0] as {
    authorMeta?: {
      name?:      string;
      nickName?:  string;
      signature?: string;
      fans?:      number;
      following?: number;
      heart?:     number;
    };
    text?:      string;
    hashtags?:  { name?: string }[];
    diggCount?: number;
    shareCount?:number;
  };

  const meta = profile.authorMeta;
  if (meta?.nickName)  lines.push(`Name: ${meta.nickName}`);
  if (meta?.signature) lines.push(`Bio: ${meta.signature}`);
  if (meta?.fans)      lines.push(`Followers: ${meta.fans.toLocaleString()}`);

  // Video captions / descriptions
  const captions = data
    .map(item => (item as { text?: string }).text)
    .filter((t): t is string => Boolean(t))
    .slice(0, 15);
  if (captions.length) {
    lines.push(`\nVideo descriptions:\n- ${captions.join("\n- ")}`);
  }

  // Hashtags used across videos
  const hashtags = [
    ...new Set(
      data.flatMap(item =>
        ((item as { hashtags?: { name?: string }[] }).hashtags ?? [])
          .map(h => h.name)
          .filter((n): n is string => Boolean(n))
      )
    ),
  ].slice(0, 40);
  if (hashtags.length) {
    lines.push(`\nHashtags used: #${hashtags.join(", #")}`);
  }

  return lines.join("\n");
}

/* ─── Apify: X / Twitter ───────────────────────────────────────── */

function extractTwitterUsername(url: string): string {
  const m = url.match(/(?:twitter|x)\.com\/@?([A-Za-z0-9_]+)/i);
  return m?.[1] ?? "";
}

async function fetchTwitterViaApify(rawUrl: string): Promise<string> {
  if (!APIFY_TOKEN) return "(Apify token not set — X/Twitter not read)";

  const username = extractTwitterUsername(rawUrl);
  if (!username) return "(Could not extract X/Twitter username from URL)";

  const endpoint =
    `https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items` +
    `?token=${APIFY_TOKEN}&timeout=90`;

  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls:   [`https://twitter.com/${username}`],
      maxItems:    15,
      addUserInfo: true,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) return `(Apify X/Twitter scraper error: HTTP ${res.status})`;

  const data = await res.json() as Record<string, unknown>[];
  if (!data?.length) return "(No X/Twitter data returned by Apify)";

  const lines: string[] = [`=== X / TWITTER: @${username} ===`];

  // Profile info from first tweet's author field
  const first = data[0] as {
    author?: {
      userName?:   string;
      name?:       string;
      description?:string;
      followers?:  number;
    };
    text?:     string;
    hashtags?: string[];
  };

  const author = first.author;
  if (author?.name)        lines.push(`Name: ${author.name}`);
  if (author?.description) lines.push(`Bio: ${author.description}`);
  if (author?.followers)   lines.push(`Followers: ${author.followers.toLocaleString()}`);

  // Tweet texts
  const tweets = data
    .map(item => (item as { text?: string }).text)
    .filter((t): t is string => Boolean(t))
    .slice(0, 20);
  if (tweets.length) lines.push(`\nRecent tweets:\n- ${tweets.join("\n- ")}`);

  // Hashtags
  const hashtags = [
    ...new Set(
      data.flatMap(item =>
        ((item as { hashtags?: string[] }).hashtags ?? [])
      )
    ),
  ].slice(0, 40);
  if (hashtags.length) lines.push(`\nHashtags: #${hashtags.join(", #")}`);

  return lines.join("\n");
}

/* ─── Apify: Facebook ──────────────────────────────────────────── */

async function fetchFacebookViaApify(rawUrl: string): Promise<string> {
  if (!APIFY_TOKEN) return "(Apify token not set — Facebook not read)";

  const endpoint =
    `https://api.apify.com/v2/acts/apify~facebook-pages-scraper/run-sync-get-dataset-items` +
    `?token=${APIFY_TOKEN}&timeout=90`;

  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [{ url: rawUrl }],
      maxPosts:  20,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) return `(Apify Facebook scraper error: HTTP ${res.status})`;

  const data = await res.json() as Record<string, unknown>[];
  if (!data?.length) return "(No Facebook data returned by Apify)";

  const lines: string[] = [`=== FACEBOOK: ${rawUrl} ===`];

  const page = data[0] as {
    title?:  string;
    name?:   string;
    about?:  string;
    likes?:  number;
    posts?:  { text?: string }[];
  };

  if (page.name || page.title) lines.push(`Name: ${page.name ?? page.title}`);
  if (page.about)  lines.push(`About: ${page.about}`);
  if (page.likes)  lines.push(`Page likes: ${page.likes.toLocaleString()}`);

  const posts = (page.posts ?? [])
    .map(p => p.text)
    .filter((t): t is string => Boolean(t))
    .slice(0, 15);
  if (posts.length) lines.push(`\nRecent posts:\n- ${posts.join("\n- ")}`);

  return lines.join("\n");
}

/* ─── Regular HTTP fetch (Pinterest, Amazon, websites) ─────────── */

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

function extractMeta(html: string, prop: string): string {
  const re = [
    new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]*name=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i"),
  ];
  for (const r of re) { const m = html.match(r); if (m?.[1]) return m[1].trim(); }
  return "";
}

async function fetchViaHttp(url: string): Promise<string> {
  if (!url.startsWith("http")) url = "https://" + url;

  const res = await fetch(url, {
    headers: BROWSER_HEADERS,
    signal:  AbortSignal.timeout(10_000),
    redirect:"follow",
  });

  if (!res.ok) return `(Could not load page: HTTP ${res.status})`;

  const html  = await res.text();
  const lines: string[] = [`=== ${url} ===`];

  const title = extractMeta(html, "og:title") || extractMeta(html, "title");
  const desc  = extractMeta(html, "og:description") || extractMeta(html, "description");
  if (title) lines.push(`Title: ${title}`);
  if (desc)  lines.push(`Description: ${desc}`);

  // Amazon wishlist items
  if (/amazon\./i.test(url)) {
    const items = [...html.matchAll(/id="itemName_[^"]*"[^>]*>([^<]+)</g)]
      .map(m => m[1].trim()).slice(0, 30);
    if (items.length) lines.push(`Wishlist items:\n- ${items.join("\n- ")}`);
  }

  // Pinterest boards / pins
  if (/pinterest\./i.test(url)) {
    const boards = [...new Set([...html.matchAll(/"name":"([^"]{3,60})"/g)].map(m => m[1]))].slice(0, 20);
    const pins   = [...new Set([...html.matchAll(/"description":"([^"]{10,200})"/g)].map(m => m[1]))].slice(0, 15);
    if (boards.length) lines.push(`Boards: ${boards.join(", ")}`);
    if (pins.length)   lines.push(`Pin descriptions:\n- ${pins.join("\n- ")}`);
  }

  // Fallback: raw text
  if (lines.length < 3) {
    lines.push(htmlToText(html).slice(0, 2000));
  }

  return lines.join("\n");
}

/* ─── Main export ───────────────────────────────────────────────── */

export async function fetchProfiles(urls: string[]): Promise<string> {
  const nonEmpty = urls.map(u => u.trim()).filter(Boolean);
  if (!nonEmpty.length) return "";

  const results = await Promise.all(
    nonEmpty.map(async (url) => {
      try {
        if (/instagram\.com/i.test(url)) {
          return await fetchInstagramViaApify(url);
        }
        if (/tiktok\.com/i.test(url)) {
          return await fetchTikTokViaApify(url);
        }
        if (/(?:twitter|x)\.com/i.test(url)) {
          return await fetchTwitterViaApify(url);
        }
        if (/facebook\.com/i.test(url)) {
          return await fetchFacebookViaApify(url);
        }
        return await fetchViaHttp(url);
      } catch (err) {
        return `(Error reading ${url}: ${err instanceof Error ? err.message : String(err)})`;
      }
    })
  );

  return results.join("\n\n" + "─".repeat(50) + "\n\n");
}
