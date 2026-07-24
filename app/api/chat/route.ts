import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, GiftSuggestion, UserLocale } from "@/lib/types";
import { searchCatalog } from "@/lib/giftCatalog";

// Generous ceiling; responses are fast now that there's no web search.
// IMPORTANT: must be declared AFTER imports so Next.js static analysis picks it up
export const maxDuration = 60;

// Strip any accidental BOM character that some editors/tools prepend to env var values
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/^﻿/, "") });

const tools: Anthropic.Messages.ToolUnion[] = [
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
      "Present a curated list of 9 gift suggestions to the user. Call this once you have decided all 9 products.",
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
              priceRange: { type: "string", description: "ONE exact price, the product's typical current price to the best of your knowledge, e.g. '€49'. Never a range." },
              reason: { type: "string", description: "Why this suits the recipient — must cite a specific signal (brand they like, activity they do, detail from their interests/notes)" },
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
- Gender: ${recipient.gender || "not specified"}
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

YOUR TASK — two phases, no web searching at all:

PHASE 1 — SYNTHESISE (pure reasoning from your own product knowledge):
Using ALL available data — recipient profile, occasion, budget, interests, notes — decide exactly 9 specific, real, well-known products you will suggest. Be fully committed: a real brand + model that genuinely exists and is commonly sold on ${loc.amazonDomain}. Draw on what you already know about real products — do NOT search the web. Each product must be the result of intersecting ALL signals together (e.g. "loves specialty coffee + minimalist aesthetic + €50 budget + birthday = Fellow Stagg EKG kettle"), not just one signal in isolation.

▸ DISTRIBUTE BY INTEREST: split the 9 gifts evenly across the listed interests — 3 interests → exactly 3 gifts each; 2 interests → 5 and 4; 1 interest → all 9 within it, spanning different product types so it never feels repetitive.

▸ HOW TO READ THE PER-INTEREST DETAIL LINES (format "Interest: what | where | level | brand"). These four signals are your product-selection algorithm — apply them mechanically for each interest's 3 gifts:
  1. WHAT (e.g. "running" not just "fitness") → locks the product category. Every gift for this interest must belong to this specific niche, never the generic parent interest.
  2. WHERE/CONTEXT (gym vs home vs outdoors; PC vs console; espresso vs pour-over) → locks the form factor. An outdoor runner needs trail/weather gear, not home-gym equipment.
  3. LEVEL → locks the price-and-sophistication tier WITHIN the stated budget: casual → accessible, well-made, foolproof picks; enthusiast → mid-to-upper tier, quality-focused; serious/competitive → spend near the top of budget on performance-grade gear they'd choose themselves.
  4. BRAND/ALREADY-HAS → taste anchor AND exclusion list: suggest items that match this brand's tier and aesthetic (or complement the gear they own), and NEVER suggest something they already have.
If a signal is missing for an interest, fall back to the broader interest + age + relationship tone.

PHASE 2 — PROPOSE (mandatory):
Call \`propose_gifts\` with exactly 9 suggestions. Never end the conversation without calling it.

You may optionally call \`search_seed_catalog\` first for supplementary inspiration from the curated catalog — but your primary selection must come from your own product knowledge in Phase 1.

▸ REAL, COMMONLY-SOLD PRODUCTS ONLY: pick products you are confident actually exist and are widely available on ${loc.amazonDomain}. The user will reach them via an ${loc.amazonDomain} search for the product name, so a precise, real, searchable brand+model name is essential. Do NOT invent product names.
▸ LOCAL LANGUAGE: write each title and description in the local language of ${loc.countryName} (${loc.language === "it" ? "Italian" : loc.language === "fr" ? "French" : loc.language === "de" ? "German" : loc.language === "es" ? "Spanish" : loc.language === "pt" ? "Portuguese" : "English"}), the way the product is commonly known there.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES FOR WORLD-CLASS GIFT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ IT MUST FEEL LIKE A GIFT, NOT A FUNCTIONAL RESTOCK. This is the single most important rule.
  Some consumables ARE lovely gifts; others feel like you emptied their pantry. The test is: is this an INDULGENT TREAT they'd feel spoiled receiving, or a FUNCTIONAL STAPLE they just re-buy to keep doing their thing?
  ✗ NEVER — functional staples / performance refills bought purely to keep an activity going: protein powder, supplements, vitamins, energy gels, camera film, guitar strings, printer ink, batteries, cleaning products, plain coffee beans/pods, basic groceries, toiletry refills, socks/underwear multipacks, and gift cards. For FITNESS especially: never protein/supplements/gels — give durable gear instead (bottle, foam roller, earbuds, GPS watch, gym bag).
  ✓ OK when the interest makes it a treat — a genuinely indulgent, giftable consumable that fits the interest: e.g. a luxury skincare cream or bath oil for WELLNESS, a fine-tea or specialty-chocolate selection, a nice scented candle for HOME. These are fine because they feel like a pampering treat, not a restock.
  ✓ BEST — durable, keepable objects the person enjoys UNWRAPPING and keeps using. Default to these; use a giftable consumable only when it genuinely feels special for that interest.

▸ NEVER LEAK YOUR REASONING INTO THE OUTPUT. Do all your budget-checking, filtering, and swapping SILENTLY, before you call propose_gifts. Every product in the final list must be a real, kept product with a clean title and a warm, customer-facing reason. NEVER output meta-commentary like "out of range — discard", "too cheap, skip", "see alternative below", "recalibrating", or any note about your own selection process. If a product doesn't fit, replace it entirely — do not include it with an apology.

▸ BE HYPER-SPECIFIC — always pick real, branded, purchasable products, never vague categories.
  ✗ FORBIDDEN: "A nice journal" / "A skincare set" / "A cooking experience" / "Luxury candle"
  ✓ The product you CHOOSE must be exact (brand + model + variant), but SPLIT the detail across fields:
    - title: short and clean — brand + product type only, max 5-6 words (e.g. "Leuchtturm1917 Bullet Journal")
    - description: this is where size, colour, variant and specs go (e.g. "A5, copertina rigida, blu scuro…")

▸ CATALOG = INSPIRATION ONLY. You are NOT limited to it. The catalog is a starting floor. Always look beyond it for better-matched real products.

▸ IF NOTES MENTION A WISH — make it your #1 suggestion. Find the exact item or the premium version of it.

▸ BUDGET IS A HARD CONSTRAINT, NOT A SUGGESTION: every product's price must sit inside ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax} (this window is already derived from the buyer's stated budget: at most 30% below it, at most 15% above it).
  ✗ ABSOLUTELY FORBIDDEN: any product priced outside that window — too cheap is just as wrong as too expensive. A ${loc.currencySymbol}20 item for a ${loc.currencySymbol}100 budget makes the buyer look stingy; a ${loc.currencySymbol}180 item blows the budget. Find an alternative inside the window instead.
  ✗ DO NOT PAD or DO NOT INFLATE. Two failure modes to avoid: (a) filling the list with lots of cheap little gadgets just because the interest has cheap products — if the budget is ${loc.currencySymbol}${recipient.budgetMin}–${loc.currencySymbol}${recipient.budgetMax} and the interest's typical items are cheap, choose FEWER categories of NICER, genuinely more expensive single items (e.g. cooking on a ${loc.currencySymbol}80 budget → a real stand mixer / premium chef's knife / cast-iron pot, NOT nine ${loc.currencySymbol}15 utensils); (b) writing a fake inflated price on a product that really costs far less just to fit the window (e.g. calling a ${loc.currencySymbol}35 water bottle "${loc.currencySymbol}95"). If a product's real price is below the window, pick a genuinely pricier product — never lie about the price.
  ✓ State ONE exact price per product (its realistic current price as best you know it, e.g. "${loc.currencySymbol}49") — never a range, never inflated. Before calling propose_gifts, check every price against the window and silently replace any that don't fit.
  EXCEPTION — only if budgetMax is ${loc.currencySymbol}2000 (meaning the user selected an open-ended "${loc.currencySymbol}500+" budget): treat this as "${loc.currencySymbol}500 and up", so higher-priced premium/luxury items are fine and there is no upper ceiling.

▸ STYLE MATCH IS NON-NEGOTIABLE: A minimalist does not want maximalist clutter. A quirky personality does not want boring basics. A classic dresser does not want streetwear. Map the stated style + social aesthetic → pick products that live in that world.

▸ EVERY REASON MUST BE PERSONAL: The "reason" field must name something specific about THIS person:
  ✗ FORBIDDEN: "Perfect for anyone who loves skincare" / "Great for someone who enjoys cooking"
  ✓ REQUIRED: "Matches their K-beauty obsession and preference for lightweight textures" / "They've been to 3 Michelin-star restaurants this year — this would slot right into that world"

▸ VARIETY — NO CLUSTERING: within each interest, the gifts must span genuinely different product TYPES. Hard cap: at most 2 items of the same sub-category. (e.g. for a runner: not 4 GPS watches — at most one watch, then earbuds, a foam roller, a bottle, a jacket… For outdoors: not 4 backpacks — one bag, then boots, a headlamp, a watch, socks. For skincare: not 9 creams.) If you catch yourself repeating a product type a third time, swap it for a different type that still fits.

▸ EXACTLY 9: the final list must contain exactly 9 products — no more, no fewer. Never stop at 5 or 6, never return 10. If you discarded some picks, replace them so you always land on 9.

▸ PERFECT FIT ONLY: every one of the 9 must be tightly, obviously matched to THIS specific person's interests, sub-interest detail, level, and occasion. No filler, no "safe generic" picks to round out the number. If a slot would be filler, find a real product that genuinely fits instead.

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

    // Agentic loop — run until stop_reason is "end_turn". With no web search,
    // this is short: Claude may optionally call search_seed_catalog once, then
    // propose_gifts. A small ceiling is plenty.
    const MAX_LOOP = 5;
    let totalInput = 0, totalOutput = 0, totalCacheWrite = 0, totalCacheRead = 0;
    for (let i = 0; i < MAX_LOOP; i++) {
      // Safety net: on the last allowed iteration, if propose_gifts still
      // hasn't been called, force it so we never return an empty result.
      const forcePropose = finalSuggestions.length === 0 && i === MAX_LOOP - 1;

      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: cachedSystem,
        tools: cachedTools,
        messages: pruneContext(currentMessages),
        ...(forcePropose ? { tool_choice: { type: "tool" as const, name: "propose_gifts" } } : {}),
      });

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
    console.log(`[DEBUG-COST] TOTAL in=${totalInput} out=${totalOutput} cacheWrite=${totalCacheWrite} cacheRead=${totalCacheRead} | TOTAL=$${tokenCost.toFixed(4)}`);

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
