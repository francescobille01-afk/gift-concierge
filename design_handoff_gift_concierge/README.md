# Handoff: Gift Concierge — intake flow + results redesign

## Overview
This is a visual redesign for the **Gift Concierge** app (the AI-powered gift-discovery
experience currently live at gift-concierge-six.vercel.app). It covers the full guided
flow: a multi-step intake wizard with a friendly named concierge persona, a "thinking"
loading state, and a curated results grid.

> **⚠️ Preserve existing logic.** This package describes the **look and feel only**.
> The app already has working backend/AI functionality — including the **social-media
> analysis** feature and the gift-recommendation engine. Do **not** remove, rewrite, or
> regress any of that. Your job is to re-skin / restructure the UI around the existing
> data and logic. Wire the new UI's inputs and outputs to the current functions; keep the
> analysis pipeline intact.

## About the design files
`Gift Concierge.dc.html` in this folder is a **design reference created in HTML** — a
working prototype showing the intended look and interactions, **not** production code to
copy verbatim. It uses a small internal templating runtime (`support.js`) for the live
preview; you do **not** need that runtime. **Recreate these designs in the Gift Concierge
codebase using its existing framework and patterns** (e.g. React/Next.js on Vercel),
reusing your current components, state, and API calls.

To preview the reference: open `Gift Concierge.dc.html` in a browser. Click through the
five intake steps → "Find my gifts" → loading → results. The sort buttons on the results
screen work.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, and interactions are all
specified below. Recreate the UI pixel-closely using your codebase's libraries, then bind
it to your real data.

---

## Design tokens

**Colors**
- Page background: `#f3ebe1` (warm cream)
- Brand panel gradient: `linear-gradient(160deg,#7c3f3f 0%,#5e2e2e 60%,#4a2222 100%)`
- Primary (maroon): `#7c3f3f`  · darker `#5e2e2e` · terracotta accent `#a8694a`
- Gold accent: `#c9a26b`  · soft gold surface `#f0e3d2`
- Ink / text: `#2a211d` (headings) · `#3a2e26` (body) · `#6b5b4d` (labels)
- Muted text: `#9a8674`, `#b3a292`, `#a8957f`
- Card surface: `#ffffff` · subtle surface `#fbf6ef` / `#fdf6ef`
- Borders: `#ece0d2`, `#e9ddd0`, `#e3d4c2`, `#e6d8c8`

**Typography** (Google Fonts)
- Display / headings: **Bricolage Grotesque**, weights 500–700
- Body / UI: **Hanken Grotesk**, weights 400–700
- Scale: H1 brand 38px/1.08; results headline 30px; step headline (concierge msg) 17px;
  card title 17.5px; body 15–16px; labels 13–14px; meta 12–12.5px. Letter-spacing
  `-.02em` on large display text.

**Radius**: chips/pills `999px`; buttons `10–12px`; cards `18px`; occasion tiles `15px`;
inputs/textarea `14px`; concierge bubble `4px 18px 18px 18px`.

**Shadows**: card `0 4px 18px rgba(124,63,63,.06)`; primary button
`0 6px 18px rgba(124,63,63,.28)`; selected chip `0 4px 12px rgba(124,63,63,.22)`.

**Spacing**: 8px base rhythm; main content max-width 640px (intake) / 980px (results);
generous 18–34px gaps between sections.

---

## Screens / Views

### 1. Intake wizard (5 steps)
**Purpose**: collect what the AI needs to recommend gifts.

**Layout**: two-column. Left **brand panel** (38%, max 520px) — fixed, decorative,
maroon gradient with logo, headline "The perfect gift, found for you.", three trust
bullets, and an avatar-stack social-proof line. Hidden below 900px. Right **main column**
holds a centered 640px-max wizard.

**Wizard chrome (all steps)**:
- Progress row: "Step N of 5" (uppercase, `#a8957f`) + step name; below it a 6px track
  `#e3d4c2` with a `linear-gradient(90deg,#c9a26b,#7c3f3f)` fill animating width
  `((step+1)/5)*100%` (0.45s ease).
- Concierge message: 46px circular avatar (maroon gradient, white "M") + a speech bubble
  with "MARGOT · YOUR CONCIERGE" label and a per-step prompt. Re-mount with a fade-in
  (`key` per step).
- Footer nav: "← Back" (ghost, hidden on step 0) + right-aligned primary button.
  Primary is disabled (gray `#e3d4c2`/`#b3a292`) until the step's requirement is met.

**Per-step content & copy**:
- **Step 0 — The occasion** · msg "Lovely — let's find something special. What's the
  occasion?" · 3-col grid of 12 tiles (emoji + label): Birthday 🎂, Christmas 🎄,
  Valentine's 💝, Mother's Day 🌸, Father's Day 👔, Graduation 🎓, Wedding 💍,
  Anniversary 💑, Housewarming 🏡, Baby Shower 👶, Just Because ✨, Other 🎁. Single-select.
  Required to continue.
- **Step 1 — The recipient** · msg "Got it. Who are you shopping for, and roughly how old
  are they?" · relationship pills (single-select): Partner, Parent, Sibling, Friend,
  Child, Grandparent, Colleague, Someone else. Then an age range slider 1–90 (label
  "X yrs", shows "90+" at max) with Baby/Teen/Adult/Senior ticks. Relationship required.
- **Step 2 — Their interests** · msg "What are they into? Pick everything that fits." ·
  multi-select pills: Cooking, Travel, Fitness, Reading, Gaming, Music, Art & Design,
  Tech, Fashion, Outdoors, Coffee, Wellness, Home, Photography. Hint shows count /
  "Pick at least one". ≥1 required.
- **Step 3 — Vibe & budget** · msg "How would you describe them — and what's your budget?"
  · multi-select vibe pills: Cozy, Adventurous, Luxe, Minimalist, Playful, Sentimental,
  Practical, Trendy. Then budget slider 10–500 step 5 (label "$X", "$500+" at max) with
  $10/$100/$250/$500 ticks. ≥1 vibe required.
- **Step 4 — A few details** · msg "Last thing: anything else I should know? The little
  details help me nail it." · textarea (placeholder about a recipient who hosts dinner
  parties) + three dashed "prompt chip" buttons that append starter text:
  "They already have…", "Loves a particular brand", "Inside joke gift". Optional.
  Primary button label becomes **"Find my gifts ✨"**.

**Selected-state styling**:
- Pill (off): white, 1.5px `#e3d4c2` border, `#5a4a40` text. (on): maroon fill, white text,
  maroon shadow.
- Tile (off): white, 1.5px `#e9ddd0`. (on): `#fdf6ef` fill, 1.5px `#7c3f3f` border,
  `#7c3f3f` text, soft maroon shadow.

### 2. Loading / "thinking" state
**Purpose**: cover the recommendation request. Centered: a 120px orbiting-dots animation
(three dots rotating, 2.4s linear) around a bobbing gift-icon disc; headline "Margot is
curating…"; a rotating status line cycling every ~0.65s through "Scanning hundreds of
hand-picked gifts… / Matching to their interests… / Checking your budget… / Ranking the
best finds…"; three pulsing dots. In the reference this auto-advances to results after
~2.6s — **replace that timer with your real recommendation call** and show results when it
resolves.

### 3. Results
**Purpose**: present curated gifts.
- Header: "CURATED FOR YOU" pill; headline "Six gifts for your {relationship}'s
  {occasion}" (built from the user's answers, lowercased); subhead referencing interests +
  budget; a "↺ Start over" ghost button.
- Sort row: "Best match" / "Price: low" / "Price: high" pill toggles (active = maroon).
- 3-col card grid (collapses to 1 col below 900px). **Card**: 148px gradient thumbnail
  (placeholder — see Assets) with category label + a "{match}% match" badge top-right;
  body has title (Bricolage 17.5px), retailer (muted), a quote-styled reason block on
  `#fbf6ef`, then a footer row with bold price + maroon "View gift →" button.
- Footer: centered "Refine my answers" button (returns to step 0).

---

## Interactions & behavior
- **Navigation**: Continue advances step 0→4; on step 4 it triggers the recommendation
  request → loading → results. Back decrements. Continue is disabled until the step's
  requirement is satisfied (see per-step "required" notes).
- **Selection**: occasion & relationship are single-select; interests & vibe are
  multi-select toggles; sliders update live labels.
- **Transitions**: progress bar width 0.45s `cubic-bezier(.4,0,.2,1)`; step content &
  concierge bubble fade-in 0.4s on each step change (keyed remount).
- **Loading**: keyframes `gcorbit` (rotate), `gcbob` (translateY ±6px), `gcpulse`
  (opacity/scale). Status line rotates on an interval.
- **Responsive**: brand panel `display:none` below 900px; main padding shrinks; results
  grid → single column.

## State management
State variables needed (names from the prototype):
- `step` (0–4), `screen` ('intake' | 'loading' | 'results')
- `occasion` (id), `relationship` (string), `age` (int), `interests` (string[]),
  `vibe` (string[]), `budget` (int), `details` (string)
- `sortBy` ('match' | 'price' | 'priceHigh')

Transitions: Continue/Back mutate `step`; final Continue sets `screen='loading'` and
fires the recommendation request; on response set `screen='results'` and store the gift
list. **Feed `occasion / relationship / age / interests / vibe / budget / details` into
your existing recommendation + social-media-analysis pipeline** — these are the inputs it
should consume.

## Design tokens → data binding notes
The reference uses 6 hard-coded sample gifts. In the real app, **render the cards from
your recommendation API response**. Expected per-gift fields: `cat` (category), `name`,
`retailer`, `price` (string, e.g. "$84"), `match` (int %), `reason` (one-line rationale —
ideal place to surface the model's explanation), and an image URL (replaces the gradient
placeholder).

## Assets
- **Fonts**: Bricolage Grotesque + Hanken Grotesk (Google Fonts). Load via your app's
  font setup.
- **Gift icon / logo**: simple inline SVG gift glyph (in the HTML `<aside>` and loader) —
  reuse your existing logo if you have one.
- **Card thumbnails**: the prototype uses warm CSS-gradient placeholders. **Replace with
  real product imagery** from your recommendation results.
- **Emoji**: used only on occasion tiles and a couple of button labels (on-brand with the
  current site).

## Files
- `Gift Concierge.dc.html` — the full high-fidelity prototype (all three screens + logic).
  Open in a browser to interact. Treat as reference, not shippable code.

---

## How to use this in Claude Code
1. Copy this `design_handoff_gift_concierge/` folder into your repo (e.g. `/design/`).
2. In Claude Code, point it at this README and say something like:
   *"Implement the Gift Concierge UI described in `design/design_handoff_gift_concierge/README.md`
   using our existing Next.js components and styles. Keep the current social-media-analysis
   and recommendation logic intact — only rebuild the UI and wire it to the existing
   functions."*
3. Have it build the intake wizard, loading state, and results grid as React components,
   binding the inputs/outputs to your existing API.
