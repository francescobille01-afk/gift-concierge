# Amazon Associates — Benefits to Leverage & To-Dos

> Reference notes on what the Amazon Associates (Italy) program gives us beyond
> the basic affiliate link, and a prioritised to-do list. Not urgent during the
> testing phase, but worth exploiting once the program is fully active.

Affiliate tag: `gifty0de-21` (amazon.it)

---

## What Amazon Associates is NOT
- **No personal discounts.** Being an Associate gives you no discount on your own purchases.
- **No free products.** (That's Amazon Vine, a separate program for reviewers.)
- **You cannot earn on your own purchases.** Self-referrals violate the Operating Agreement, generally don't count as qualifying sales, and can get the account closed.

## Benefits we CAN leverage

### 1. Whole-cart commission (24h window) — most underused
When someone clicks our affiliate link and buys on Amazon within 24 hours, we earn commission on **everything in their cart**, not just the suggested gift. Someone arriving from Gifty who then also buys a washing machine → we earn on that too. Design implication: getting the click is what matters; the specific product is secondary.

### 2. Bounties — often more profitable than product commissions
Amazon pays fixed fees for referring sign-ups to its own services:
- **Prime**, **Audible** free trial, **Kindle Unlimited**, **Amazon Business**, **Amazon Music**.
- Fit with Gifty: for "Reading" gifts, surface an Audible/Kindle Unlimited trial; for other interests, relevant service trials. A single Audible trial bounty can beat the commission on a physical book.
- **TO-DO:** design a tasteful way to surface a relevant Amazon service (e.g. Audible for book lovers) as one of the options, where it genuinely fits.

### 3. PA API (Product Advertising API) — the product-data engine
- Resolves a product name → real product link, real image, current price, availability. Free, no per-call fee.
- Unlocks after the account's **first 3 qualifying sales**.
- This is the planned fix for: real prices (no more invented €95 water bottles), real product photos, exact product links.
- **TO-DO (next, after 3 sales):** integrate PA API server-side so Claude picks product names and the API resolves each into a real listing. See TESTING_PHASE_NOTES.md §1.

### 4. SiteStripe — immediate, before PA API
- A toolbar shown on Amazon pages when logged into the Associates account. Lets you generate affiliate links and **grab official product images** on the fly.
- Useful right now for manual work / spot-checks before PA API is live.

### 5. OneLink — for multi-country (later)
- Geolocalizes links: a French visitor who clicks lands on amazon.fr and we earn there.
- Requires joining each target marketplace's Associates program and having a tag per marketplace.
- **TO-DO:** set up when re-enabling non-Italian locales (see TESTING_PHASE_NOTES.md §2).

### 6. Reporting dashboard
- Clicks, conversion, earnings per link/product. Use it to learn which interests/price points actually convert and feed that back into the prompt.
- **TO-DO:** once traffic exists, review which categories convert and tune suggestions toward them.

## Honest constraints
- **Low commission rates** in Italy (often ~3–4%, some categories less) → thin margins. Bounties help offset this.
- **24h cookie only** — short window vs other affiliate programs; whoever doesn't buy same-day is lost.

## Priority order (post-testing)
1. Make the first 3 qualifying sales → unlock PA API.
2. Integrate PA API for real links/images/prices.
3. Add tasteful Amazon-service bounties (Audible/Kindle/Prime) where they fit the interest.
4. Use the reporting dashboard to tune suggestions toward what converts.
5. When going multi-country: OneLink + per-marketplace tags.
