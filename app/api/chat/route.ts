import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, GiftSuggestion, UserLocale } from "@/lib/types";
import { searchCatalog } from "@/lib/giftCatalog";

// Allow up to 120 seconds for multiple web_search calls per gift
// IMPORTANT: must be declared AFTER imports so Next.js static analysis picks it up
export const maxDuration = 120;

// Strip any accidental BOM character that some editors/tools prepend to env var values
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/^﻿/, "") });

const tools: Anthropic.Messages.ToolUnion[] = [
  {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: 9,
  },
  {
    name: "search_seed_catalog",
    description:
      "Search the in-memory gift catalog for matching items. Call this to find relevant gifts before proposing them.",
    input_schema: {
      type: "object",
      properties: {
        occasionTags: {
          type: "array",
          items: { type: "string" },
          description: "Occasion tags to filter by, e.g. ['birthday', 'graduation']",
        },
        interestTags: {
          type: "array",
          items: { type: "string" },
          description: "Interest tags to filter by, e.g. ['cooking', 'travel']",
        },
        budgetMin: { type: "number", description: "Minimum budget in USD" },
        budgetMax: { type: "number", description: "Maximum budget in USD" },
      },
      required: ["occasionTags", "interestTags", "budgetMin", "budgetMax"],
    },
  },
  {
    name: "propose_gifts",
    description:
      "Present a curated list of 9 gift suggestions to the user. Call this after searching the catalog and web-searching each product for real image and links.",
    input_schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string", description: "SHORT product name: brand + product type, max 5-6 words. NO sizes, inch counts, model codes, colours or spec clutter — those belong in the description. e.g. 'Mercer Culinary Santoku' not 'Santoku Mercer Culinary Genesis 7 Pollici'" },
              description: { type: "string" },
              priceRange: { type: "string", description: "ONE exact price, the product's current Amazon price to the best of your knowledge, e.g. '€49'. Never a range." },
              reason: { type: "string", description: "Why this suits the recipient — must cite a specific signal (brand they like, activity they do, social post detail, wishlist item, style observed)" },
              imageUrl: { type: "string", description: "A direct, real image URL (ending in .jpg/.png/.webp etc, or a CDN image URL) of the ACTUAL product, taken from the web_search results for this product's official page or Amazon listing. Never invent a URL — only use one you actually saw in search results." },
              officialLink: { type: "string", description: "The real URL of the brand's or retailer's official product page for this exact item, found via web_search. Omit if you could not find a real one." },
              amazonLink: { type: "string", description: "The real URL of this exact product on the buyer's local Amazon store (matching their amazonDomain), found via web_search. Omit if no real Amazon listing was found." },
              category: { type: "string", description: "Short product category label for the card, e.g. 'Skincare', 'Kitchen', 'Tech', 'Wellness', 'Fashion', 'Books', 'Coffee', 'Outdoor'. One or two words max." },
            },
            required: ["id", "title", "description", "priceRange", "reason"],
          },
        },
      },
      required: ["suggestions"],
    },
  },
];

function buildSystemPrompt(recipient: ChatRequest["recipient"], locale?: UserLocale): string {
  const loc = locale ?? { countryCode: "US", countryName: "United States", currency: "USD", currencySymbol: "$", amazonDomain: "amazon.com", language: "en" };

  const localeSection = `
BUYER'S LOCATION:
- Country: ${loc.countryName} (${loc.countryCode})
- Currency: ${loc.currency} (${loc.currencySymbol})
- Local Amazon store: ${loc.amazonDomain}

CRITICAL LOCALISATION RULES:
▸ LANGUAGE: Respond ENTIRELY in ${loc.language === "it" ? "Italian" : loc.language === "fr" ? "French" : loc.language === "de" ? "German" : loc.language === "es" ? "Spanish" : loc.language === "pt" ? "Portuguese" : "English"}. Every word of your response must be in this language — no exceptions.
▸ Express ALL prices in ${loc.currency} (use symbol ${loc.currencySymbol}). Do NOT use USD unless the user is in the US.
▸ Suggest products that are readily available in ${loc.countryName} — prefer local brands, European/regional availability.
▸ When referencing where to buy, mention ${loc.amazonDomain} or known local retailers in ${loc.countryName}.
▸ If a product is typically sold under a different name or brand in ${loc.countryName}, use the local name.
▸ Avoid suggesting US-only stores (Target, Walmart, Best Buy, etc.) — use equivalents available in ${loc.countryName}.
`;


  return `You are an elite personal gift concierge — the AI equivalent of a world-class personal shopper who knows every brand, trend, and product category across all markets.
${localeSection}
RECIPIENT PROFILE:
- Name: ${recipient.name || "the recipient"}
- Age: ${recipient.age || "unknown"}
- Relation to giver: ${recipient.relation || "unspecified"}
- Occasion: ${recipient.occasion || "general gift"}
- Interests & hobbies: ${recipient.interests || "not specified"}
- Budget: ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax}
- Additional context: ${recipient.notes || "none"}

INFER THE GIFT'S TONE FROM THE RELATIONSHIP (no separate question was asked — derive it yourself):
▸ Partner/spouse → romantic, playful-intimate, or a luxury "wow" piece — lean into emotional/sensory gifts.
▸ Best friend/friend → fun, likeable, a bit premium — something that shows you know them well, not overly sentimental.
▸ Parent/grandparent → warm and affectionate, practical, or a shared experience — avoid anything trendy/gimmicky.
▸ Sibling/child → playful, personal, can be a bit cheeky or nostalgic.
▸ Colleague/boss → elegant, professional, safe and tasteful — avoid anything too personal or intimate.
▸ Someone else/unspecified → keep it universally likeable, safe, and high quality.
Let this tone guide product selection and the "reason" you give — do not mention that you inferred it.

YOUR TASK — follow these phases in order:

PHASE 1 — SYNTHESISE (no searches yet, pure reasoning):
Using ALL available data — recipient profile, occasion, budget, interests, notes — decide exactly 9 specific products you will suggest. Be fully committed: Brand + model + size/variant/colour already decided. Each product must be the result of intersecting ALL signals together (e.g. "loves specialty coffee + minimalist aesthetic + €50 budget + birthday = Fellow Stagg EKG kettle"), not just one signal in isolation. At this stage you must also have a runner-up product ready for each slot in case the Amazon search fails.

▸ DISTRIBUTE BY INTEREST: split the 9 gifts evenly across the listed interests — 3 interests → exactly 3 gifts each; 2 interests → 5 and 4; 1 interest → all 9 within it, spanning different product types so it never feels repetitive.

▸ HOW TO READ THE PER-INTEREST DETAIL LINES (format "Interest: what | where | level | brand"). These four signals are your product-selection algorithm — apply them mechanically for each interest's 3 gifts:
  1. WHAT (e.g. "running" not just "fitness") → locks the product category. Every gift for this interest must belong to this specific niche, never the generic parent interest.
  2. WHERE/CONTEXT (gym vs home vs outdoors; PC vs console; espresso vs pour-over) → locks the form factor. An outdoor runner needs trail/weather gear, not home-gym equipment.
  3. LEVEL → locks the price-and-sophistication tier WITHIN the stated budget: casual → accessible, well-made, foolproof picks; enthusiast → mid-to-upper tier, quality-focused; serious/competitive → spend near the top of budget on performance-grade gear they'd choose themselves.
  4. BRAND/ALREADY-HAS → taste anchor AND exclusion list: suggest items that match this brand's tier and aesthetic (or complement the gear they own), and NEVER suggest something they already have.
If a signal is missing for an interest, fall back to the broader interest + age + relationship tone.

PHASE 2 — AMAZON LOOKUP (exactly ONE web_search per product — never repeat a search for the same product):
For each of your 9 decided products, call \`web_search\` ONCE with the query: the exact product name + " ${loc.amazonDomain}" as plain words (do NOT use "site:" — it is unreliable with this search tool). Example: \`Fellow Stagg EKG kettle ${loc.amazonDomain}\`. This is a confirmation search — you already know what you want, you just need the real URL and image.
- If a result from that ONE search is on ${loc.amazonDomain}: extract the real product URL and the CDN image URL (format: "m.media-amazon.com/images/I/...").
- If NO result from that ONE search is on ${loc.amazonDomain}: do NOT search again for the same product. Immediately move on and use your pre-decided runner-up's name for the \`propose_gifts\` call instead, without a confirmed link.
▸ HARD RULE: you have a strict budget of 9 web_search calls for the entire task — one per product, no retries, no second attempts at a different phrasing. If you spend more than one search on any single product you will run out before reaching Phase 3.

PHASE 3 — PROPOSE (mandatory, always run this phase):
Call \`propose_gifts\` with exactly 9 final suggestions no matter what — even if some products lack a confirmed \`amazonLink\` because their search didn't return one. A partial list is far better than no list. Never end the conversation without calling \`propose_gifts\`.

Also call \`search_seed_catalog\` at any point to get supplementary inspiration from the curated catalog — but your primary selection must come from your Phase 1 synthesis.

▸ AMAZON IS PREFERRED, NOT BLOCKING: try to confirm every product on ${loc.amazonDomain} in Phase 2, but if a search comes back empty, still include that product in \`propose_gifts\` without an \`amazonLink\` rather than dropping it or stalling.
▸ AMAZON LOCALISATION: Search and link to ${loc.amazonDomain} only. Use the product title and description as they appear on ${loc.amazonDomain} — in the local language of ${loc.countryName}. If the listing title is in ${loc.language === "it" ? "Italian" : loc.language === "fr" ? "French" : loc.language === "de" ? "German" : loc.language === "es" ? "Spanish" : loc.language === "pt" ? "Portuguese" : "English"}, use that title.
▸ NEVER fabricate a URL. Every \`amazonLink\` must come directly from a web_search result you actually retrieved — if you don't have one, omit the field, don't invent one.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES FOR WORLD-CLASS GIFT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ BE HYPER-SPECIFIC — always pick real, branded, purchasable products, never vague categories.
  ✗ FORBIDDEN: "A nice journal" / "A skincare set" / "A cooking experience" / "Luxury candle"
  ✓ The product you CHOOSE must be exact (brand + model + variant), but SPLIT the detail across fields:
    - title: short and clean — brand + product type only, max 5-6 words (e.g. "Leuchtturm1917 Bullet Journal")
    - description: this is where size, colour, variant and specs go (e.g. "A5, copertina rigida, blu scuro…")

▸ CATALOG = INSPIRATION ONLY. You are NOT limited to it. The catalog is a starting floor. Always look beyond it for better-matched real products.

▸ IF NOTES MENTION A WISH — make it your #1 suggestion. Find the exact item or the premium version of it.

▸ BUDGET IS A HARD CONSTRAINT, NOT A SUGGESTION: every product's price must sit inside ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax} (this window is already derived from the buyer's stated budget: at most 30% below it, at most 15% above it).
  ✗ ABSOLUTELY FORBIDDEN: any product priced outside that window — too cheap is just as wrong as too expensive. A ${loc.currencySymbol}20 item for a ${loc.currencySymbol}100 budget makes the buyer look stingy; a ${loc.currencySymbol}180 item blows the budget. Find an alternative inside the window instead.
  ✓ State ONE exact price per product (its current Amazon price as best you know it, e.g. "${loc.currencySymbol}49") — never a range. Before calling propose_gifts, check every single price against the window and discard/replace any that don't fit.
  EXCEPTION — only if budgetMax is ${loc.currencySymbol}2000 (meaning the user selected an open-ended "${loc.currencySymbol}500+" budget): treat this as "${loc.currencySymbol}500 and up", so higher-priced premium/luxury items are fine and there is no upper ceiling.

▸ STYLE MATCH IS NON-NEGOTIABLE: A minimalist does not want maximalist clutter. A quirky personality does not want boring basics. A classic dresser does not want streetwear. Map the stated style + social aesthetic → pick products that live in that world.

▸ EVERY REASON MUST BE PERSONAL: The "reason" field must name something specific about THIS person:
  ✗ FORBIDDEN: "Perfect for anyone who loves skincare" / "Great for someone who enjoys cooking"
  ✓ REQUIRED: "Matches their K-beauty obsession and preference for lightweight textures" / "They've been to 3 Michelin-star restaurants this year — this would slot right into that world"

▸ VARIETY: Your 9 suggestions must span at least 6 different product categories. Do not suggest 3 moisturisers. Give the user real choice.

▸ INTERNAL QUALITY CHECK before calling propose_gifts:
  For each suggestion, ask: "Would a stranger know this gift was picked specifically for this person, or does it look like it came from a generic 'Top 10 gifts' listicle?" If it looks generic, replace it.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFINEMENT ANALYSIS — when the message contains [Reactions] data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When the user has reacted to previous suggestions, run this analysis BEFORE selecting new gifts:

STEP A — PATTERN-MATCH THE ❤️ LOVED ITEMS:
• Price tier: are they in the lower, middle, or upper range of the budget? → stay in that zone.
• Category: physical product or experience? Practical or indulgent? → double down on what they loved.
• Brand quality tier: luxury, branded mid-market, artisanal, or functional? → match it.
• Aesthetic: what style do the loved items share? → amplify it.

STEP B — PATTERN-MATCH THE 👎 REJECTED ITEMS:
• What category / aesthetic do they share? → AVOID THE ENTIRE CATEGORY, not just those items.
• e.g., if all rejected items are "homeware" → this person doesn't want homeware, full stop.

STEP C — DECODE THE 📦 ALREADY OWN ITEMS:
• These reveal what the person actively buys for themselves.
• Use the brand/quality tier as a baseline. Do NOT suggest more of the same category.

STEP D — SELECT COMPLETELY NEW GIFTS THAT:
1. Sit in the same price tier and aesthetic as the ❤️ loved items.
2. Explore a fresh category (not a direct repeat of any previous suggestion).
3. Avoid the entire style of rejected categories.
4. Surprise — find the item in the loved-pattern that the user hasn't thought of yet.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFINEMENT BY 1–10 RATINGS — when the user gives a rated list of previous suggestions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The user may rate each previous suggestion from 1 (not for them) to 10 (perfect). Treat this as the strongest signal you have — stronger than the original intake answers. Do NOT re-ask any intake questions; the recipient profile is unchanged, only your gift selection should change.

• Items rated 8–10: treat as near-perfect — stay extremely close to their price tier, category, and aesthetic. Find sibling/adjacent products in that same world.
• Items rated 5–7: directionally fine but not exciting — keep the general category/price tier but vary the specific item or aesthetic.
• Items rated 1–4: a clear miss — avoid that entire category and that price tier positioning (too cheap/expensive/wrong vibe) in your new picks.
• Weight your new suggestions toward whatever pattern emerges across the high-rated items (shared brand tier, category, aesthetic, practicality vs indulgence).
• Give 9 NEW suggestions — do not just repeat the same items, and do not repeat anything rated 1–4.

Keep your text replies short and warm. Get to proposals fast — the user is here for gift ideas, not conversation.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { recipient, messages, reactions } = body;

    const reactionSummary = Object.entries(reactions)
      .filter(([, r]) => r !== null)
      .map(([id, r]) => `Gift ${id}: ${r}`)
      .join(", ");

    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (reactionSummary) {
      const lastMsg = anthropicMessages[anthropicMessages.length - 1];
      if (lastMsg?.role === "user") {
        anthropicMessages[anthropicMessages.length - 1] = {
          role: "user",
          content: `${lastMsg.content}\n\n[Reactions to previous suggestions: ${reactionSummary}]`,
        };
      }
    }

    let currentMessages = [...anthropicMessages];
    let finalText = "";
    let finalSuggestions: GiftSuggestion[] = [];

    // Built once per request — identical on every loop iteration below, so we
    // cache it (system prompt + tools) instead of paying full price to resend
    // the same unchanged instructions on every iteration of the agentic loop.
    const systemPrompt = buildSystemPrompt(recipient, body.locale);
    const cachedSystem: Anthropic.Messages.TextBlockParam[] = [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ];
    const cachedTools: Anthropic.Messages.ToolUnion[] = tools.map((tool, idx) =>
      idx === tools.length - 1 ? { ...tool, cache_control: { type: "ephemeral" } } : tool
    );

    // Prune web_search_tool_result content from older assistant messages to avoid
    // hitting the 200k context window limit (each search result is ~2–5k tokens).
    // We keep the last 4 messages intact; older ones have search payloads stripped.
    function pruneContext(msgs: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
      const KEEP = 4;
      return msgs.map((msg, idx) => {
        if (idx >= msgs.length - KEEP || msg.role !== "assistant") return msg;
        if (!Array.isArray(msg.content)) return msg;
        const pruned = (msg.content as Anthropic.ContentBlock[]).map(b =>
          b.type === "web_search_tool_result"
            ? ({ type: "text", text: "[search results omitted to save context]" } as Anthropic.TextBlock)
            : b
        );
        return { ...msg, content: pruned };
      });
    }

    // Agentic loop — run until stop_reason is "end_turn"
    const MAX_LOOP = 20;
    const MAX_SEARCHES = 9;
    let webSearchCount = 0;
    let totalInput = 0, totalOutput = 0, totalCacheWrite = 0, totalCacheRead = 0;
    for (let i = 0; i < MAX_LOOP; i++) {
      // Safety net: if we're close to running out of search budget (or loop
      // iterations) and propose_gifts still hasn't been called, force it —
      // guarantees we never return an empty result, even with partial data.
      const forcePropose =
        finalSuggestions.length === 0 &&
        (webSearchCount >= MAX_SEARCHES - 1 || i === MAX_LOOP - 2);

      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: cachedSystem,
        tools: cachedTools,
        messages: pruneContext(currentMessages),
        ...(forcePropose ? { tool_choice: { type: "tool" as const, name: "propose_gifts" } } : {}),
      });

      webSearchCount += response.content.filter(
        (b) => b.type === "server_tool_use" && (b as { name?: string }).name === "web_search"
      ).length;

      totalInput += response.usage.input_tokens;
      totalOutput += response.usage.output_tokens;
      totalCacheWrite += response.usage.cache_creation_input_tokens ?? 0;
      totalCacheRead += response.usage.cache_read_input_tokens ?? 0;

      if (response.stop_reason === "end_turn") {
        finalText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        break;
      }

      if (response.stop_reason === "tool_use") {
        const assistantContent = response.content;
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of assistantContent) {
          if (block.type !== "tool_use") continue;

          if (block.name === "search_seed_catalog") {
            const input = block.input as {
              occasionTags: string[];
              interestTags: string[];
              budgetMin: number;
              budgetMax: number;
            };
            const results = searchCatalog(
              input.occasionTags,
              input.interestTags,
              input.budgetMin,
              input.budgetMax
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(results),
            });
          }

          if (block.name === "propose_gifts") {
            const input = block.input as { suggestions: GiftSuggestion[] };
            finalSuggestions = input.suggestions;
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify({ ok: true }),
            });
          }
        }

        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: assistantContent },
          { role: "user", content: toolResults },
        ];
        continue;
      }

      // Unexpected stop reason — grab any text and exit
      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      break;
    }

    const HAIKU_IN = 1, HAIKU_OUT = 5, HAIKU_CACHE_WRITE = 1.25, HAIKU_CACHE_READ = 0.1; // $ per 1M tokens
    const tokenCost =
      (totalInput * HAIKU_IN + totalOutput * HAIKU_OUT + totalCacheWrite * HAIKU_CACHE_WRITE + totalCacheRead * HAIKU_CACHE_READ) / 1_000_000;
    const searchCost = webSearchCount * 0.01;
    console.log(`[DEBUG-COST] TOTAL in=${totalInput} out=${totalOutput} cacheWrite=${totalCacheWrite} cacheRead=${totalCacheRead} searches=${webSearchCount} | tokenCost=$${tokenCost.toFixed(4)} searchCost=$${searchCost.toFixed(4)} TOTAL=$${(tokenCost+searchCost).toFixed(4)}`);

    const responseBody: ChatResponse = {
      message: finalText,
      suggestions: finalSuggestions,
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("/api/chat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
