# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server at http://localhost:3000
npm run build      # production build
npm run start      # serve production build
```

No test runner or linter is configured yet.

## Architecture

Single-page Next.js 14 App Router app with no database, no authentication, and no server-side state. Everything lives in React state for the duration of one browser session.

### Data flow

1. User fills out **recipient profile** (name, age, relation, occasion, interests, budget) in the landing form on `app/page.tsx`.
2. On submit, the profile is serialised into the first user message and sent to `POST /api/chat`.
3. The API route runs an **agentic loop** against `claude-haiku-4-5`:
   - Claude calls `search_seed_catalog` → executes `lib/giftCatalog.searchCatalog()` filtering by occasion tags, interest tags, and budget range.
   - Claude calls `propose_gifts` → the suggestions array is captured and returned to the client.
   - Loop runs up to 5 iterations until `stop_reason === "end_turn"`.
4. The client appends the assistant's text reply to the chat panel and replaces the suggestions panel with any new `GiftSuggestion[]`.
5. Subsequent user messages include the full conversation history **and** a `reactions` map (`Record<string, ReactionType>`) so Claude can see which suggestions were accepted/rejected.

### Key files

| File | Role |
|---|---|
| `app/page.tsx` | Entire client UI — recipient form, chat bubbles, suggestion cards with reaction buttons, "Choose this" highlight |
| `app/api/chat/route.ts` | POST handler; builds system prompt from recipient profile; agentic loop handling `tool_use` / `end_turn` stop reasons |
| `lib/giftCatalog.ts` | Static array of 25 `GiftEntry` objects + `searchCatalog()` filter function |
| `lib/types.ts` | Shared TypeScript types (`RecipientProfile`, `ChatMessage`, `GiftSuggestion`, `ReactionType`, `ChatRequest`, `ChatResponse`) |

### Tool definitions (in the API route)

- **`search_seed_catalog`** — takes `occasionTags[]`, `interestTags[]`, `budgetMin`, `budgetMax`; calls `searchCatalog()` and returns matching `GiftEntry[]` as a JSON string.
- **`propose_gifts`** — takes `suggestions[]` (each with `id`, `title`, `description`, `priceRange`, `reason`, optional `link`); result is captured in `finalSuggestions` and returned to the client.

### Adding gift catalog entries

Each entry in `lib/giftCatalog.ts` must have:
```ts
{ id, title, description, occasionTags, interestTags, priceMin, priceMax, link? }
```
Tags are matched case-insensitively. The `"any"` occasion tag matches all occasion filters.

## Communication Style

The user is not a developer or technician. Always use plain, simple language when giving instructions or explanations. Avoid jargon, acronyms, and technical terms unless absolutely necessary — and if you must use one, explain it in plain words right after. Prefer short sentences and step-by-step instructions over dense paragraphs.

## Spending & Cost Approval

Before taking any action that incurs a monetary cost — including but not limited to API calls (Anthropic, or any other paid API), installing paid packages, provisioning cloud resources, or anything else that charges money — always stop and ask for explicit permission first. Include:
- What will be called and why
- The pricing model (e.g. $/1M tokens, $/request)
- A concrete cost estimate for the full task (not just one call) — best case, expected, and worst case if the range is wide

Do not proceed until the user confirms.

## Environment

`ANTHROPIC_API_KEY` must be set in `.env.local`. The model is hard-coded to `claude-haiku-4-5` in `app/api/chat/route.ts`.
