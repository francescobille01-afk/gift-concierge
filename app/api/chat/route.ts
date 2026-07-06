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
              title: { type: "string" },
              description: { type: "string" },
              priceRange: { type: "string", description: "e.g. '€25–€45'" },
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

PHASE 2 — AMAZON LOOKUP (one targeted search per product):
For each of your 9 decided products, call \`web_search\` with a precise query: the exact product name + "${loc.amazonDomain}". Example: \`"Fellow Stagg EKG kettle" site:${loc.amazonDomain}\`. This is a confirmation search, not a discovery search — you already know what you want, you just need the real URL and image.
- If the search confirms the product is on ${loc.amazonDomain}: extract the real product URL and the CDN image URL (format: "m.media-amazon.com/images/I/...").
- If the product is NOT found on ${loc.amazonDomain}: immediately use your pre-decided runner-up for that slot and search for that instead. Do NOT waste a search on a failed product — swap and move on.

PHASE 3 — PROPOSE:
Call \`propose_gifts\` with exactly 9 final suggestions. Every suggestion must have a real \`amazonLink\` from Phase 2. Never fabricate a URL.

Also call \`search_seed_catalog\` at any point to get supplementary inspiration from the curated catalog — but your primary selection must come from your Phase 1 synthesis.

▸ AMAZON IS MANDATORY: Only propose products you found on ${loc.amazonDomain} in Phase 2.
▸ AMAZON LOCALISATION: Search and link to ${loc.amazonDomain} only. Use the product title and description as they appear on ${loc.amazonDomain} — in the local language of ${loc.countryName}. If the listing title is in ${loc.language === "it" ? "Italian" : loc.language === "fr" ? "French" : loc.language === "de" ? "German" : loc.language === "es" ? "Spanish" : loc.language === "pt" ? "Portuguese" : "English"}, use that title.
▸ NEVER fabricate a URL. Every \`amazonLink\` must come directly from a web_search result you actually retrieved.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES FOR WORLD-CLASS GIFT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ BE HYPER-SPECIFIC — always name real, branded, purchasable products with full detail.
  ✗ FORBIDDEN: "A nice journal" / "A skincare set" / "A cooking experience" / "Luxury candle"
  ✓ REQUIRED: "Leuchtturm1917 A5 Bullet Journal in Dark Blue, Hardcover" / "Le Creuset 26cm Signature Cast Iron Casserole in Marseille Blue" / "Tatcha The Water Cream 50ml"
  Brand + model name + size/variant/colour. Every time. No exceptions.

▸ CATALOG = INSPIRATION ONLY. You are NOT limited to it. The catalog is a starting floor. Always look beyond it for better-matched real products.

▸ IF NOTES MENTION A WISH — make it your #1 suggestion. Find the exact item or the premium version of it.

▸ BUDGET IS A HARD CONSTRAINT, NOT A SUGGESTION: The buyer's budget is ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax}.
  ✗ ABSOLUTELY FORBIDDEN: any suggestion whose priceRange falls even partly outside ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax}. A ${loc.currencySymbol}180 item is NOT acceptable for a ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax} budget, even if it's a great match otherwise — find a cheaper alternative instead.
  ✓ Both the low AND high end of each suggestion's priceRange must sit inside ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax}. Before calling propose_gifts, check every single priceRange against this range and discard/replace any that don't fit.
  EXCEPTION — only if budgetMax is ${loc.currencySymbol}2000 (meaning the user selected an open-ended "${loc.currencySymbol}500+" budget): treat this as "${loc.currencySymbol}500 and up", so higher-priced premium/luxury items are fine and there is no upper ceiling.
  Use the full range you're given — don't cluster every suggestion near the bottom of the range either.

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
    for (let i = 0; i < 20; i++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: buildSystemPrompt(recipient, body.locale),
        tools,
        messages: pruneContext(currentMessages),
      });

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
