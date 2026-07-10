# Testing-Phase Notes & Deferred Work

> **Purpose of this file:** During the friends-and-family testing phase we made
> a few deliberate, temporary trade-offs to keep costs low and the scope small.
> None of them are bugs. This document explains each one, why it was made, and
> exactly what to change to undo it when we move past testing. A new developer
> should be able to read this and understand the current state in a few minutes.

Last updated: 2026-07-10

---

## 1. Web search removed — products come from the model's own knowledge

### What we do today
The gift-suggestion endpoint (`app/api/chat/route.ts`) does **not** call any web
search. Claude (`claude-haiku-4-5`) proposes 9 real, well-known products purely
from its training knowledge, then the client builds a "Buy on Amazon" button
that links to an **amazon.it search** for the product name (with the affiliate
tag attached).

### Why
The previous version forced 9 real `web_search` calls per request to confirm an
exact amazon.it product URL for each gift. That cost ~$0.30/request
(~$0.09 fixed search fees + ~$0.21 of returned-text tokens) and in testing it
confirmed **zero** amazon.it links anyway. Removing web search dropped the cost
to roughly ~$0.02/request.

### The trade-off / known limitation
- Claude only knows products up to its training cutoff (~end 2024). **Brand-new
  products (2025+) and obscure niche items are unknown to it**, and in the worst
  case it can hallucinate a product name that doesn't exist → the Amazon search
  button then lands on an empty/irrelevant results page.
- This is acceptable during testing because the gifts we recommend are
  established, heavily-documented classics (Bodum French press, Comandante
  grinder, Sony headphones, famous books, etc.) that Claude knows reliably.
- The button goes to an Amazon **search results page**, not the exact product
  page. Affiliate commission still works (any purchase within 24h is credited),
  but it's one extra click for the user and not pixel-perfect.

### The real fix (do this after testing) — Amazon Product Advertising (PA) API
The proper long-term solution is the **Amazon PA API**, the official affiliate
API. You give it a product name/keywords and it returns the exact product link,
a real product image, the current price, and availability — **for free, no
per-call fee**. It unlocks after the account's **first 3 affiliate sales**.

Once available, the flow becomes: Claude proposes product names (as now) →
server calls PA API to resolve each into a real listing (exact link + image +
live price) → cards show real photos and exact prices and link straight to the
product page. This fixes **all** of the limitations above at once (new products,
real prices, real images, exact links) and stays cheap.

An intermediate option (if PA API isn't ready) is a **hybrid**: keep
knowledge-based proposals but run 1–2 targeted web searches only for the
products Claude is least sure about, instead of all 9.

### Where the relevant code lives
- `app/api/chat/route.ts` — `tools` array (web_search tool was removed here),
  the two-phase system prompt (PHASE 1 synthesise / PHASE 2 propose), and the
  agentic loop (`MAX_LOOP = 5`).
- `app/page.tsx` — `GiftCard` component, `fallbackLink` builds the amazon.it
  search URL; `addAffiliateTag()` attaches the affiliate tag and forces the
  amazon.it host.
- `[DEBUG-COST]` `console.log` in `route.ts` prints per-request token cost to the
  server logs (Vercel). Safe to remove once cost is confirmed stable.

---

## 2. Locale locked to Italy / amazon.it

### What we do today
- Default language is **always Italian** on first load (`langIdx` defaults to
  `2` in `app/page.tsx`); browser/IP auto-detection is intentionally bypassed.
- **All** Amazon links are forced to **amazon.it**, regardless of the language
  picker, both in `addAffiliateTag()` (rewrites any Amazon host to amazon.it)
  and in `buildRecipientAndLocale()` / `app/chat/page.tsx` (`amazonDomain`
  hardcoded to `"amazon.it"`).

### Why
The Amazon affiliate program is currently **IT-only** (tag `gifty0de-21`).
Sending users to any other Amazon store would produce non-affiliated links and
earn nothing. Testing is with Italian friends, so Italian-only keeps it clean.

### Important: the infrastructure is fully intact
The language dropdown still works and manual language choices are still saved
(`localStorage` key `gifty-lang-idx`). The full translation tables for EN / IT /
FR / DE / ES / PT are all still present. We only stopped *auto-switching away
from Italian* and *linking to non-IT Amazon stores*. Nothing was deleted.

### What to change to re-enable multi-geography (do this after testing)
1. `app/page.tsx` — restore auto-detect: the `useEffect` that currently just
   calls `setLangIdx(2)` should call `detectLangIdx()` + the IP lookup via
   `buildLocaleFromIP()` (both functions are still in the file, unused).
   Reset the `langIdx` default from `2` back to `0`.
2. `addAffiliateTag()` in `app/page.tsx` — remove the block that rewrites the
   hostname to amazon.it; keep only the tag insertion. **But** you also need a
   per-locale affiliate tag (one tag per Amazon marketplace) — a single
   amazon.it tag does not earn on amazon.fr/.de/etc.
3. `buildRecipientAndLocale()` in `app/page.tsx` and the locale in
   `app/chat/page.tsx` — restore the real per-country `amazonDomain` mapping
   (the original conditional / `AMAZON_DOMAINS[cc]` lookup) instead of the
   hardcoded `"amazon.it"`.
4. Prerequisite: **register the affiliate program in each target marketplace**
   and store the per-marketplace tags before flipping any of the above on.

### Deep-dive interest questions — language coverage gap
The per-interest deep-dive questions (`deepDive` in the `TR` tables) are fully
written for **EN and IT only**. FR/DE/ES/PT currently have deep-dive config for
**Fitness only**. When re-enabling those locales, complete the `deepDive`
entries for the other 13 interests in those four languages (mirror the IT/EN
structure: `detailQ`, `detailPlaceholder`, `contextQ`, `contextOpts`, `levelQ`,
`levelOpts`, `brandQ`, `brandPlaceholder`).

---

## Quick checklist for "graduating" out of the testing phase
- [ ] Make the first 3 affiliate sales → unlock Amazon PA API
- [ ] Integrate PA API to resolve product names → real link + image + price
- [ ] Register affiliate program in each target Amazon marketplace, store tags
- [ ] Re-enable locale auto-detect and per-country `amazonDomain`
- [ ] Make `addAffiliateTag` marketplace-aware (right tag per store)
- [ ] Complete `deepDive` translations for FR/DE/ES/PT (all 14 interests)
- [ ] Remove the `[DEBUG-COST]` log from `route.ts`
