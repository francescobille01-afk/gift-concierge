import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, GiftSuggestion, UserLocale } from "@/lib/types";
import { searchCatalog } from "@/lib/giftCatalog";
import { fetchProfiles } from "@/lib/profileFetcher";

// Allow up to 60 seconds — needed when Apify is fetching social profiles (takes 20-45s)
// IMPORTANT: must be declared AFTER imports so Next.js static analysis picks it up
export const maxDuration = 60;

// Strip any accidental BOM character that some editors/tools prepend to env var values
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/^﻿/, "") });

const tools: Anthropic.Tool[] = [
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
      "Present a curated list of gift suggestions to the user. Call this after searching the catalog to surface your top picks.",
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
              link: { type: "string" },
              imageSearchQuery: { type: "string", description: "2–5 keywords for finding a product photo, e.g. 'tatcha luminous skin mist bottle' or 'le creuset cast iron pan blue'. Be specific: include brand name + product type + a visual descriptor." },
              category: { type: "string", description: "Short product category label for the card, e.g. 'Skincare', 'Kitchen', 'Tech', 'Wellness', 'Fashion', 'Books', 'Coffee', 'Outdoor'. One or two words max." },
              matchScore: { type: "number", description: "Integer 80–99 indicating how well this gift matches the recipient based on their profile, interests, style, and social signals. Be honest — reserve 95+ for near-perfect matches." },
            },
            required: ["id", "title", "description", "priceRange", "reason", "imageSearchQuery"],
          },
        },
      },
      required: ["suggestions"],
    },
  },
];

function buildSystemPrompt(recipient: ChatRequest["recipient"], profileContext?: string, locale?: UserLocale): string {
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


  const profileSection = profileContext
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ SOCIAL PROFILE DATA — YOUR PRIMARY GIFT-SELECTION SOURCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${profileContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

THIS DATA IS GOLD. It is real evidence of what this person actually buys, wears, eats, and aspires to.
You MUST use it as the dominant source for every single suggestion. The recipient profile fields (age, relation, budget) are secondary context only.

MANDATORY ANALYSIS — complete all 3 steps internally before touching the gift catalog:

STEP 1 — SIGNAL INVENTORY (list every signal you find):
• Brands mentioned, tagged, or hashtagged → classify: luxury / mid-market / budget + category
• Price tolerance: Loro Piana / La Mer / Rolex = luxury expectations; Zara / H&M = practical mindset
• Aesthetic code: dominant visual/style keywords from hashtags, captions, bio (#minimalism, #darkacademia, #streetwear, #coastal, #cottagecore, #luxury, etc.) — THIS IS THE SINGLE MOST IMPORTANT SIGNAL
• Activity fingerprint: repeated behaviours — restaurant check-ins, gym posts, hiking, coffee shop photos → each is a gift category
• Aspiration signals: "I need this" / "obsessed" / "want this" captions = near-explicit gift targets
• Wishlist / Amazon / Pinterest data: treat as direct evidence of desired items
• Location/lifestyle cues: city, travel habits, home aesthetic

STEP 2 — TASTE PROFILE (synthesise before selecting):
• Price comfort zone (floor and ceiling within the stated budget)
• Primary aesthetic in one phrase (e.g. "warm minimalist", "luxury streetwear", "adventure-ready", "refined maximalist")
• Gift love language: experience vs object? Practical vs indulgent? Branded vs artisanal?
• Top 3 product categories with the strongest evidence

STEP 3 — SELECTION RULE (non-negotiable):
▸ Every suggestion MUST cite a specific signal from Step 1 in its "reason" field.
▸ "reason" must name the actual evidence: a brand they post, a hashtag they use, an activity they repeat, a wish they expressed.
▸ If you cannot connect a gift to a specific signal, do NOT suggest it.
▸ Generic gifts (basic candles, photo frames, plain notebooks) are FORBIDDEN when social data is present.
▸ Do not tell the user you read their profile.
`
    : "";

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
${profileSection}

YOUR TASK:
1. Call \`search_seed_catalog\` first to get relevant starting ideas from the curated catalog.
2. Then call \`propose_gifts\` with 4–5 final suggestions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES FOR WORLD-CLASS GIFT SUGGESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▸ BE HYPER-SPECIFIC — always name real, branded, purchasable products with full detail.
  ✗ FORBIDDEN: "A nice journal" / "A skincare set" / "A cooking experience" / "Luxury candle"
  ✓ REQUIRED: "Leuchtturm1917 A5 Bullet Journal in Dark Blue, Hardcover" / "Le Creuset 26cm Signature Cast Iron Casserole in Marseille Blue" / "Tatcha The Water Cream 50ml"
  Brand + model name + size/variant/colour. Every time. No exceptions.

▸ CATALOG = INSPIRATION ONLY. You are NOT limited to it. The catalog is a starting floor. Always look beyond it for better-matched real products.

▸ IF NOTES MENTION A WISH — make it your #1 suggestion. Find the exact item or the premium version of it.

▸ BUDGET PRECISION: Express all prices in ${loc.currency}. Stay WITHIN the stated range.
  Under ${loc.currencySymbol}50 → premium consumables, small branded accessories, subscriptions
  ${loc.currencySymbol}50–150 → mid-range branded goods, curated experiences, quality tools
  ${loc.currencySymbol}150+ → premium / luxury items, meaningful keepsakes
  ✗ Never suggest a ${loc.currencySymbol}25 item for a ${loc.currencySymbol}150 budget. Use the full range.

▸ STYLE MATCH IS NON-NEGOTIABLE: A minimalist does not want maximalist clutter. A quirky personality does not want boring basics. A classic dresser does not want streetwear. Map the stated style + social aesthetic → pick products that live in that world.

▸ EVERY REASON MUST BE PERSONAL: The "reason" field must name something specific about THIS person:
  ✗ FORBIDDEN: "Perfect for anyone who loves skincare" / "Great for someone who enjoys cooking"
  ✓ REQUIRED: "Matches their K-beauty obsession and preference for lightweight textures" / "They've been to 3 Michelin-star restaurants this year — this would slot right into that world"

▸ VARIETY: Your 4–5 suggestions must span different product categories. Do not suggest 3 moisturisers. Give the user real choice.

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

Keep your text replies short and warm. Get to proposals fast — the user is here for gift ideas, not conversation.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { recipient, messages, reactions } = body;

    // Fetch social / web profiles on the FIRST message only (no need to re-fetch every turn)
    // Cap at 45s so the function never times out before Claude can respond
    let profileContext: string | undefined;
    if (messages.length <= 1 && recipient.socialUrls?.length) {
      const timeout = new Promise<string>((resolve) =>
        setTimeout(() => resolve("(Social profile fetch timed out — proceeding without it)"), 45_000)
      );
      profileContext = await Promise.race([fetchProfiles(recipient.socialUrls), timeout]);
    }

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

    // Agentic loop — run until stop_reason is "end_turn"
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2048,
        system: buildSystemPrompt(recipient, profileContext, body.locale),
        tools,
        messages: currentMessages,
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
