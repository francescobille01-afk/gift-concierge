# Legal & Compliance Checklist (Italy / EU)

> **NOT LEGAL ADVICE.** This is a practical checklist compiled to help you know
> what a site like Gifty typically needs to operate compliantly in Italy/EU.
> Before publishing final legal texts, have them reviewed by a lawyer or use a
> reputable legal-text generator (e.g. iubenda, Termly, Cookiebot) that outputs
> Italy/EU-compliant documents. Nothing here replaces professional advice.

Context that drives these requirements:
- Users sign in (Clerk: Google OAuth + email) → we process personal data.
- Users type data about **other people** (gift recipient's name, age, interests) → third-party personal data.
- That data is sent to **Anthropic (US)** to generate suggestions.
- We use **Amazon affiliate links** → Amazon Associates disclosure is mandatory.
- We use cookies / localStorage (auth, language pref) and third-party services (Vercel, Clerk, ipapi geolocation).
- Audience is EU (Italy) → **GDPR** + Italian **Garante Privacy** + **ePrivacy/cookie** rules apply.

---

## 1. Amazon Associates disclosure (MANDATORY — required by Amazon's Operating Agreement)
- Must clearly and conspicuously state you participate in the Amazon affiliate program and earn from qualifying purchases.
- Standard Italian wording: **"In qualità di Affiliato Amazon, ricevo un guadagno dagli acquisti idonei."**
- Place it: in the footer (site-wide) AND near where affiliate links appear (the results page).
- Also identify the specific store: participation in the **Programma di Affiliazione Amazon EU / amazon.it**.
- Do not imply Amazon endorses you. Do not show scraped prices as if live/guaranteed (see §5).

## 2. Privacy Policy (MANDATORY under GDPR)
Must be a dedicated, linked page. Should cover:
- **Identity of the data controller** (you / the company) + a contact email.
- **What data** is collected: account email + Google profile (via Clerk), language preference & session data (localStorage), IP address (used for geolocation via ipapi), and the **recipient details users type** (name, age, interests, notes).
- **Purposes & legal bases**: providing the service (contract), authentication (contract), affiliate functionality, any analytics (consent).
- **Third parties / processors** the data flows to: **Clerk** (auth, US), **Vercel** (hosting, US), **Anthropic** (AI suggestions, US), **ipapi** (geolocation), **Google** (OAuth), **Amazon** (affiliate). List each and link their policies.
- **International transfers**: data goes to the **US** (Clerk, Vercel, Anthropic). Must state this and the safeguard (Standard Contractual Clauses / provider's DPF certification). Verify each provider's transfer mechanism.
- **Retention**: how long you keep account data; note that recipient/gift data is **session-only, not stored server-side** (currently true — good, state it).
- **User rights**: access, rectification, erasure, restriction, portability, objection, and right to complain to the gg**Garante per la protezione dei dati personali**.
- **Third-party (recipient) data note**: users input data about other people; state that only minimal data is used, transiently, to generate suggestions, and is sent to Anthropic for processing.

## 3. Cookie Policy + Cookie Banner (MANDATORY — ePrivacy + Garante cookie guidelines)
- A **cookie/consent banner** is required. Under the Italian Garante's guidelines: no pre-ticked boxes, an equally-easy **"Reject"** as **"Accept"**, granular choice for non-essential categories, and no non-essential cookies set before consent.
- **Essential/technical** cookies (auth/session via Clerk, language preference) are exempt from consent but must still be described.
- **Non-essential** (any analytics/marketing you add later) require prior consent.
- A dedicated **Cookie Policy** page listing each cookie/localStorage item, purpose, duration, provider.
- Note: the Amazon affiliate cookie is set on Amazon's domain after the user clicks through; disclose that clicking an affiliate link may set Amazon cookies.

## 4. Terms of Service / Terms of Use (STRONGLY RECOMMENDED)
- Rules of acceptable use; account terms.
- **Limitation of liability** and disclaimers (see §5).
- Clarify you are **not the seller** — purchases happen on Amazon under Amazon's terms; you are not responsible for orders, delivery, returns, or product issues.
- Intellectual-property ownership of the site.
- Governing law / jurisdiction (Italy).

## 5. AI-generated content + price/availability disclaimer (IMPORTANT for this product)
- Suggestions are **AI-generated** and may be inaccurate or occasionally list a product that isn't available.
- **Prices and availability shown are indicative only** and may differ from Amazon — the price on Amazon at checkout is the one that counts. (Especially true now, pre-PA-API, where prices are model estimates.)
- No guarantee a suggested product suits the recipient; it's inspiration, not advice.
- Put a short version of this near the results and the full version in the Terms.

## 6. Service-provider identification (Italy — D.Lgs 70/2003, e-commerce law)
- An information-society service must identify the provider: name, a contact email, and — **if run as a registered business** — company name, address, VAT number (P.IVA), REA/registration.
- If you currently operate as a private individual pre-registration, at minimum publish a **name/entity + contact email**.

## 7. Tax / business registration (NOT a website item, but flag it)
- Affiliate income is taxable. Earning commissions regularly in Italy generally requires proper **tax treatment and likely a VAT position (P.IVA)** once it's an ongoing activity.
- **Talk to a commercialista (accountant)** before/when income starts. Out of scope for the website itself but do not ignore it.

## 8. Consumer-protection note
- Because you don't sell directly (Amazon does), you avoid most e-commerce seller obligations (right of withdrawal, warranties, etc. sit with Amazon).
- But **advertising must not be misleading** (Codice del Consumo): don't overstate savings, don't present estimated prices as guaranteed, keep the affiliate relationship transparent (§1).

---

## Minimum to publish before real users (practical checklist)
- [ ] Footer affiliate disclosure ("In qualità di Affiliato Amazon…") site-wide + on results page
- [ ] Privacy Policy page (GDPR, listing Clerk/Vercel/Anthropic/ipapi/Google/Amazon + US transfers)
- [ ] Cookie Policy page + compliant consent banner (Garante rules)
- [ ] Terms of Service page (not-the-seller + liability + governing law)
- [ ] AI/price disclaimer (short near results, full in Terms)
- [ ] Provider identification (name + contact email; business details if registered)
- [ ] Link all of the above in the footer
- [ ] (Off-site) speak to a commercialista about tax/P.IVA before income starts
- [ ] Have the final texts reviewed by a lawyer or generated via a compliant tool (iubenda/Termly/Cookiebot)

## Fastest compliant path
Use **iubenda** (Italian company, GDPR/Garante-focused) or **Termly**: they generate Privacy Policy, Cookie Policy, and a compliant cookie banner tailored to the exact third parties you list (Clerk, Vercel, Anthropic, ipapi, Google, Amazon). Cheaper and faster than bespoke drafting for a project at this stage; still worth a lawyer's eyes before scaling.
