"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  RecipientProfile,
  ChatMessage,
  GiftSuggestion,
  ReactionType,
  ChatResponse,
  Session,
  UserLocale,
} from "@/lib/types";
import { detectLang, detectLangFromBrowser, t, tOccasion, tRelation, tInterest, tStyleDisplay, tAvoid } from "@/lib/i18n";
import type { LangCode } from "@/lib/i18n";
import { saveSession, loadSession, listSessions, deleteSession } from "@/lib/sessionStorage";

/* ─────────────────────────── Data ─────────────────────────────── */

const AMAZON_TAG = "gifty0de-21";
function addAffiliateTag(url: string): string {
  if (!url || !url.includes("amazon.")) return url;
  try { const u = new URL(url); u.searchParams.set("tag", AMAZON_TAG); return u.toString(); }
  catch { return url; }
}

const OCCASIONS = [
  { label: "Birthday",        emoji: "🎂" },
  { label: "Christmas",       emoji: "🎄" },
  { label: "Valentine's Day", emoji: "💝" },
  { label: "Mother's Day",    emoji: "🌸" },
  { label: "Father's Day",    emoji: "👔" },
  { label: "Graduation",      emoji: "🎓" },
  { label: "Wedding",         emoji: "💍" },
  { label: "Anniversary",     emoji: "💑" },
  { label: "Housewarming",    emoji: "🏡" },
  { label: "Baby Shower",     emoji: "👶" },
  { label: "Just Because",    emoji: "✨" },
  { label: "Other",           emoji: "✏️" },
];

const RELATIONS = [
  { label: "Partner / Spouse", emoji: "💑" },
  { label: "Best Friend",      emoji: "🤜" },
  { label: "Friend",           emoji: "😊" },
  { label: "Parent",           emoji: "🧑‍🦳" },
  { label: "Sibling",          emoji: "👫" },
  { label: "Child",            emoji: "🧒" },
  { label: "Grandparent",      emoji: "👴" },
  { label: "Colleague / Boss", emoji: "💼" },
  { label: "Other",            emoji: "✏️" },
];

/* ── Amazon domain per country ── */
const AMAZON_DOMAINS: Record<string, string> = {
  IT: "amazon.it",
  DE: "amazon.de",
  FR: "amazon.fr",
  ES: "amazon.es",
  GB: "amazon.co.uk",
  US: "amazon.com",
  CA: "amazon.ca",
  AU: "amazon.com.au",
  JP: "amazon.co.jp",
  IN: "amazon.in",
  BR: "amazon.com.br",
  MX: "amazon.com.mx",
  NL: "amazon.nl",
  SE: "amazon.se",
  PL: "amazon.pl",
  TR: "amazon.com.tr",
  AE: "amazon.ae",
  SA: "amazon.sa",
  SG: "amazon.sg",
};

/* ── Flag emoji per language code ── */
const LANG_FLAGS: Record<string, string> = {
  it: "🇮🇹", fr: "🇫🇷", de: "🇩🇪", es: "🇪🇸",
  pt: "🇵🇹", nl: "🇳🇱", pl: "🇵🇱", sv: "🇸🇪",
  tr: "🇹🇷", ja: "🇯🇵", zh: "🇨🇳", ar: "🇸🇦",
};

/* ── Currency symbol per currency code ── */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", GBP: "£", JPY: "¥", INR: "₹", BRL: "R$",
  MXN: "$", CAD: "$", AUD: "$", SEK: "kr", PLN: "zł",
  TRY: "₺", AED: "د.إ", SAR: "﷼", SGD: "$",
};

function buildLocale(raw: {
  country_code?: string;
  country_name?: string;
  currency?: string;
}): UserLocale {
  const cc  = (raw.country_code ?? "US").toUpperCase();
  const cur = (raw.currency ?? "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] ?? cur + " ";
  return {
    countryCode:    cc,
    countryName:    raw.country_name ?? "Unknown",
    currency:       cur,
    currencySymbol: sym,
    amazonDomain:   AMAZON_DOMAINS[cc] ?? "amazon.com",
    language:       "en", // language is handled separately via navigator.language
  };
}

/* Build budget option labels using the detected currency symbol */
function buildBudgetOptions(sym: string, under = "Under", above = "+") {
  return [
    { label: `${under} ${sym}25`,    min: 0,   max: 25   },
    { label: `${sym}25 – ${sym}50`,  min: 25,  max: 50   },
    { label: `${sym}50 – ${sym}75`,  min: 50,  max: 75   },
    { label: `${sym}75 – ${sym}100`, min: 75,  max: 100  },
    { label: `${sym}100 – ${sym}150`,min: 100, max: 150  },
    { label: `${sym}150 – ${sym}200`,min: 150, max: 200  },
    { label: `${sym}200 – ${sym}350`,min: 200, max: 350  },
    { label: `${sym}350 – ${sym}500`,min: 350, max: 500  },
    { label: `${sym}500 ${above}`,   min: 500, max: 2000 },
  ];
}

const BUDGET_OPTIONS = buildBudgetOptions("$"); // default, overridden once locale loads

const INTERESTS = [
  { label: "Cooking & Food",      emoji: "🍳" },
  { label: "Fine Dining & Restaurants", emoji: "🍽️" },
  { label: "Travel & Exploring",  emoji: "✈️" },
  { label: "Fitness & Gym",       emoji: "🏋️" },
  { label: "Running & Cycling",   emoji: "🚴" },
  { label: "Yoga & Mindfulness",  emoji: "🧘" },
  { label: "Books & Reading",     emoji: "📚" },
  { label: "Gaming",              emoji: "🎮" },
  { label: "Art & Painting",      emoji: "🎨" },
  { label: "Music & Concerts",    emoji: "🎵" },
  { label: "Tech & Gadgets",      emoji: "💻" },
  { label: "Fashion & Style",     emoji: "👗" },
  { label: "Beauty & Skincare",   emoji: "✨" },
  { label: "Outdoors & Hiking",   emoji: "🏕️" },
  { label: "Photography",         emoji: "📷" },
  { label: "Home & Interior",     emoji: "🏡" },
  { label: "Wine & Cocktails",    emoji: "🍷" },
  { label: "Coffee & Tea",        emoji: "☕" },
  { label: "Plants & Gardening",  emoji: "🌱" },
  { label: "Film & TV Series",    emoji: "🎬" },
  { label: "Podcasts & Learning", emoji: "🎧" },
  { label: "Sustainability & Eco",emoji: "♻️" },
];

const SPENDING_HABITS = [
  { label: "Clothes & Fashion",   emoji: "🛍️" },
  { label: "Tech & Electronics",  emoji: "📱" },
  { label: "Food & Restaurants",  emoji: "🍽️" },
  { label: "Gym & Fitness",       emoji: "💪" },
  { label: "Travel & Hotels",     emoji: "✈️" },
  { label: "Home & Furniture",    emoji: "🛋️" },
  { label: "Beauty & Skincare",   emoji: "💄" },
  { label: "Books & Courses",     emoji: "📚" },
  { label: "Music & Concerts",    emoji: "🎶" },
  { label: "Art & Design",        emoji: "🎨" },
  { label: "Experiences & Events",emoji: "🎟️" },
  { label: "Health & Wellness",   emoji: "🌿" },
];

const STYLES = [
  { label: "Minimalist & clean",     emoji: "⬜", sub: "Less is more — quality over quantity" },
  { label: "Classic & timeless",     emoji: "🏛️", sub: "Elegant, well-made, never trendy"    },
  { label: "Trendy & fashion-forward",emoji:"🔥", sub: "Always on the latest thing"           },
  { label: "Quirky & unique",        emoji: "🎲", sub: "Unusual finds, conversation pieces"   },
  { label: "Outdoorsy & functional", emoji: "🏕️", sub: "Practical gear for an active life"   },
  { label: "Maximalist & bold",      emoji: "🌈", sub: "More colour, more personality"        },
];

const AVOID_OPTIONS = [
  { label: "No alcohol / caffeine", emoji: "🚫" },
  { label: "Vegan / eco-conscious", emoji: "🌱" },
  { label: "Prefer experiences over things", emoji: "🎟️" },
  { label: "Small space — no clutter", emoji: "🏠" },
  { label: "Already has too much stuff", emoji: "📦" },
  { label: "Don't want anything too personal", emoji: "🤝" },
  { label: "Avoid anything generic / gift-sethy", emoji: "🎁" },
];

/* ─────────────────────────── Types ─────────────────────────────── */

interface ConvMsg {
  from:  "bot" | "user";
  text:  string;
}

interface Gathered {
  name:           string;
  occasion:       string;
  relation:       string;
  ageRange:       string;
  budgetMin:      number;
  budgetMax:      number;
  interests:      string[];
  interestDetail: string;
  style:          string;
  wishlistHint:   string;
  avoidTags:      string[];
  socialUrl:      string;
}

const EMPTY: Gathered = {
  name: "", occasion: "", relation: "", ageRange: "",
  budgetMin: 25, budgetMax: 100,
  interests: [], interestDetail: "",
  style: "", wishlistHint: "",
  avoidTags: [], socialUrl: "",
};

/* ─────────────────────── Step definitions ──────────────────────── */

// Contextual examples shown in the follow-up based on what the user actually picked
const INTEREST_EXAMPLES: Record<string, string> = {
  "Cars":                       '"loves Formula 1 especially Ferrari", "always buying new cars — currently drives a BMW M4", "into car detailing and track days"',
  "Cooking & Food":             '"obsessed with Japanese food specifically", "home chef, just bought a KitchenAid", "loves hosting big dinner parties"',
  "Fine Dining & Restaurants":  '"Michelin-star restaurants only", "knows every hot new opening in the city", "big into wine pairings"',
  "Travel & Exploring":         '"backpacker type", "luxury hotels only, travels business class", "obsessed with Japan/Italy — goes every year"',
  "Fitness & Gym":              '"powerlifter not cardio", "CrossFit fanatic with all the gear", "training for a triathlon"',
  "Running & Cycling":          '"training for a marathon, runs 60km/week", "road cyclist, has a high-end Cervélo", "obsessed with Strava data"',
  "Yoga & Mindfulness":         '"hot yoga every morning", "into Ayurveda and breathwork, very wellness-focused"',
  "Books & Reading":            '"reads 50+ books a year", "only fiction — big Donna Tartt fan", "loves philosophy and Stoicism"',
  "Gaming":                     '"PC gaming, has a high-end custom rig", "PlayStation, plays competitive shooters", "big Nintendo fan"',
  "Art & Painting":             '"paints watercolours as a hobby", "collects contemporary art", "graphic designer by trade"',
  "Music & Concerts":           '"goes to every festival — Glastonbury, Coachella", "vinyl record collector", "plays guitar and records music"',
  "Tech & Gadgets":             '"Apple ecosystem person, always first to upgrade", "into smart home — Sonos, Philips Hue", "audiophile with high-end headphones"',
  "Fashion & Style":            '"into luxury brands like Loro Piana and Brunello Cucinelli", "streetwear — Supreme, Palace, Off-White", "classic minimal — only neutral colours"',
  "Beauty & Skincare":          '"10-step skincare routine, very into K-beauty", "loves luxury brands — La Mer, Augustinus Bader", "obsessed with fragrance"',
  "Outdoors & Hiking":          '"does multi-day treks, just came back from Patagonia", "wild camping, very minimal kit", "rock climber"',
  "Photography":                '"shoots on film, not digital", "street photography in black and white", "has a Sony A7 mirrorless"',
  "Home & Interior":            '"just moved into a new flat, furnishing from scratch", "obsessed with Scandinavian design and clean lines", "big plant person"',
  "Wine & Cocktails":           '"wine collector, loves Burgundy and natural wine", "makes cocktails from scratch, has a full bar setup"',
  "Coffee & Tea":               '"specialty coffee — has a La Marzocco at home", "obsessed with matcha and Japanese tea ceremony"',
  "Plants & Gardening":         '"has 100+ houseplants, knows every Latin name", "serious vegetable gardener"',
  "Film & TV Series":           '"cinephile — only arthouse and foreign films", "watches every Marvel/prestige TV on release day"',
  "Podcasts & Learning":        '"listens to 10+ hours of podcasts a week, mostly tech and business", "into philosophy and self-development books"',
  "Sustainability & Eco":       '"only buys second-hand or sustainable brands", "vegan, very eco-conscious in every purchase"',
};

type StepId =
  | "name" | "occasion" | "relation" | "ageRange" | "budget"
  | "interests" | "interestDetail" | "style"
  | "wishlistHint" | "avoid" | "social";

interface Step {
  id:        StepId;
  question:  (g: Gathered) => string;
  inputType: "text" | "age" | "grid" | "style-grid" | "budget" | "multiselect" | "url" | "freetext";
  skippable?: boolean;
}

function buildSteps(lang: LangCode): Step[] {
  const s = t(lang);
  return [
    {
      id:        "name",
      question:  () => s.q_name,
      inputType: "text",
    },
    {
      id:        "occasion",
      question:  (g) => s.q_occasion(g.name),
      inputType: "grid",
    },
    {
      id:        "relation",
      question:  (g) => s.q_relation(g.name),
      inputType: "grid",
    },
    {
      id:        "ageRange",
      question:  (g) => s.q_age(g.name),
      inputType: "age",
    },
    {
      id:        "budget",
      question:  () => s.q_budget,
      inputType: "budget",
    },
    {
      id:        "interests",
      question:  (g) => s.q_interests(g.name),
      inputType: "multiselect",
    },
    {
      id:        "interestDetail",
      question:  (g) => {
        const top = g.interests.slice(0, 3);
        const relevantExamples = top
          .map(i => {
            const ex = INTEREST_EXAMPLES[i];
            return ex ? `• ${i}: ${ex}` : null;
          })
          .filter(Boolean)
          .join("\n");
        const topStr = top.join(", ") || "those interests";
        return s.q_interestDetail(topStr, relevantExamples);
      },
      inputType: "freetext",
      skippable: true,
    },
    {
      id:        "style",
      question:  (g) => s.q_style(g.name),
      inputType: "style-grid",
    },
    {
      id:        "wishlistHint",
      question:  (g) => s.q_wishlist(g.name),
      inputType: "freetext",
      skippable: true,
    },
    {
      id:        "avoid",
      question:  (g) => s.q_avoid(g.name),
      inputType: "multiselect",
    },
    {
      id:        "social",
      question:  (g) => s.q_social(g.name),
      inputType: "url",
      skippable: true,
    },
  ];
}

/* ─────────────────────── Helpers ───────────────────────────────── */

function gatheredToRecipient(g: Gathered): RecipientProfile {
  const interestStr = g.interests.join(", ");

  const noteParts = [
    g.style          ? `Style: ${g.style}.`                          : "",
    g.interestDetail ? `Specific interest details: ${g.interestDetail}.` : "",
    g.wishlistHint   ? `Has been wanting: ${g.wishlistHint}.`        : "",
    g.avoidTags.length ? `Avoid: ${g.avoidTags.join(", ")}.`         : "",
  ];

  return {
    name:       g.name,
    age:        g.ageRange,
    relation:   g.relation,
    occasion:   g.occasion,
    interests:  interestStr,
    budgetMin:  g.budgetMin,
    budgetMax:  g.budgetMax,
    notes:      noteParts.filter(Boolean).join(" "),
    socialUrls: g.socialUrl ? [g.socialUrl] : [],
  };
}

function buildLoadingStages(name: string, hasSocial: boolean, s: ReturnType<typeof t>) {
  const social: { icon: string; text: string }[] = hasSocial ? [
    { icon: "🔍", text: s.loading_social_profile   },
    { icon: "📸", text: s.loading_social_posts      },
    { icon: "📍", text: s.loading_social_locations  },
    { icon: "🧠", text: s.loading_social_taste      },
  ] : [];
  return [
    ...social,
    { icon: "🎯", text: s.loading_matching(name)    },
    { icon: "✨", text: s.loading_finalising         },
  ];
}

function buildFirstMessage(g: Gathered, currencySymbol = "$"): string {
  // Auto-generate interest context from known examples even if the user skipped the detail step
  const autoInterestContext = g.interestDetail
    ? ""
    : g.interests
        .slice(0, 3)
        .map((interest) => {
          const ex = INTEREST_EXAMPLES[interest];
          return ex ? `• ${interest}: typical enthusiast signals — ${ex}` : null;
        })
        .filter(Boolean)
        .join("\n");

  const lines = [
    `I need a ${g.occasion} gift for ${g.name}.`,
    g.relation    ? `Relationship: ${g.relation}.`                         : "",
    g.ageRange    ? `Age: ${g.ageRange}.`                                  : "",
    g.interests.length
      ? `Interests & hobbies: ${g.interests.join(", ")}.`                  : "",
    g.interestDetail
      ? `Interest details (from the buyer): ${g.interestDetail}`           : "",
    autoInterestContext
      ? `Interest context (use as background signal):\n${autoInterestContext}` : "",
    g.style       ? `Personal style: ${g.style}.`                          : "",
    g.wishlistHint
      ? `⭐ THEY HAVE MENTIONED WANTING: "${g.wishlistHint}" — make this your #1 pick or find the best version of it.`
      : "",
    g.avoidTags.length
      ? `Hard constraints — avoid these: ${g.avoidTags.join(", ")}.`       : "",
    `Budget: ${currencySymbol}${g.budgetMin}–${currencySymbol}${g.budgetMax}. Stay within this range and use it fully — don't suggest cheap items for a generous budget.`,
    g.socialUrl
      ? `⚡ SOCIAL PROFILE PROVIDED: I have shared this person's social media profile in your system context. This is the most valuable signal you have — mine it deeply for brands, aesthetics, activities, and aspirations. Every suggestion must connect to something specific found there.`
      : "",
    "Please propose 4–5 specific, real, named products with brand + model + variant. Each must feel tailored to this exact person, not a generic 'top gift' pick.",
  ];
  return lines.filter(Boolean).join("\n");
}

/* ── Brand mark — gift box with ribbon bow (clean outline style) ── */
function GiftConciergeIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="11.5" width="16" height="9.5" rx="1.5"/>
      <rect x="3" y="8.5" width="18" height="3.5" rx="1"/>
      <line x1="12" y1="8.5" x2="12" y2="21"/>
      <path d="M12 8.5 C10.5 6 7 5.5 6.5 7.5 C6 9 9 9.5 12 8.5Z"/>
      <path d="M12 8.5 C13.5 6 17 5.5 17.5 7.5 C18 9 15 9.5 12 8.5Z"/>
    </svg>
  );
}

/* ─────────────────────── Suspense wrapper ──────────────────────── */

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-[#FDFAF7]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 animate-pulse" />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}

/* ──────────────────────── Main component ───────────────────────── */

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  /* ── Phase: "onboarding" | "loading" | "chat" ── */
  const [phase,         setPhase]         = useState<"onboarding" | "loading" | "chat">("onboarding");
  const [loadingStage,  setLoadingStage]  = useState(0);
  const [stepIndex,     setStepIndex]     = useState(0);
  const [showTyping,    setShowTyping]    = useState(true);
  const [inputReady,    setInputReady]    = useState(false);
  const [convMsgs,      setConvMsgs]      = useState<ConvMsg[]>([]);
  const [gathered,      setGathered]      = useState<Gathered>({
    ...EMPTY,
    name:     searchParams.get("name")     ?? "",
    occasion: searchParams.get("occasion") ?? "",
  });

  /* multi-select buffers */
  const [pickedInterests, setPickedInterests] = useState<string[]>([]);
  const [pickedAvoid,     setPickedAvoid]     = useState<string[]>([]);
  const [textInput,       setTextInput]       = useState("");

  /* ── After onboarding ── */
  const sessionIdRef = useRef(crypto.randomUUID());
  const [recipient,    setRecipient]    = useState<RecipientProfile | null>(null);
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [chatInput,    setChatInput]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [suggestions,  setSuggestions]  = useState<GiftSuggestion[]>([]);
  const [reactions,    setReactions]    = useState<Record<string, ReactionType>>({});
  const [chosen,       setChosen]       = useState<string | null>(null);
  const [activeTab,    setActiveTab]    = useState<"chat" | "gifts">("chat");
  const [lovedHistory, setLovedHistory] = useState<GiftSuggestion[]>([]);
  const [copied,       setCopied]       = useState(false);
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [locale,       setLocale]       = useState<UserLocale>({
    countryCode:    "US",
    countryName:    "United States",
    currency:       "USD",
    currencySymbol: "$",
    amazonDomain:   "amazon.com",
    language:       "en",
  });
  // Start with English on both server + client to avoid hydration mismatch.
  // Switch to browser language (or URL ?lang= param from landing page) in useEffect.
  const [lang,       setLang]       = useState<LangCode>("en");
  const [nativeLang, setNativeLang] = useState<LangCode>("en");
  const [budgetOptions, setBudgetOptions] = useState(BUDGET_OPTIONS);

  /* ── Localised steps + strings — recompute when lang changes ── */
  const STEPS  = buildSteps(lang);
  const strings = t(lang);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const textRef      = useRef<HTMLInputElement>(null);
  const hasStarted   = useRef(false); // prevents double-fire in React dev mode

  // Always-fresh refs so setTimeout closures never capture stale lang/strings/STEPS
  const stringsRef = useRef(strings);
  stringsRef.current = strings;
  const stepsRef = useRef(STEPS);
  stepsRef.current = STEPS;
  const langRef = useRef(lang);
  langRef.current = lang;

  /* ── Detect language (after hydration to avoid server/client mismatch) ── */
  useEffect(() => {
    // Prefer the ?lang= param passed by the landing page; fall back to browser language
    const urlLang = searchParams.get("lang") as LangCode | null;
    const detected = urlLang && ["en","it","fr","de","es","pt"].includes(urlLang)
      ? urlLang
      : detectLangFromBrowser();
    setLang(detected);
    setNativeLang(detected);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load history + handle ?restore=SESSION_ID from history page ── */
  useEffect(() => {
    setHistorySessions(listSessions());
    const restoreId = searchParams.get("restore");
    if (restoreId) {
      const s = loadSession(restoreId);
      if (s) {
        sessionIdRef.current = s.id;
        setRecipient(s.recipient);
        setMessages(s.messages);
        setSuggestions(s.suggestions);
        setReactions(s.reactions);
        setChosen(s.chosen);
        setLovedHistory(s.lovedHistory ?? []);
        setPhase("chat");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Detect user location via free IP geolocation ── */
  useEffect(() => {
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((raw) => {
        const loc = buildLocale(raw);
        setLocale(loc);
        // Language comes from navigator.language (set at init), not from IP
        setBudgetOptions(buildBudgetOptions(loc.currencySymbol));
      })
      .catch(() => {/* silently keep the USD default */});
  }, []);

  /* ── Rebuild budget labels whenever language changes ── */
  useEffect(() => {
    setBudgetOptions(buildBudgetOptions(locale.currencySymbol, strings.budget_under, strings.budget_above));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, locale.currencySymbol]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convMsgs, showTyping, inputReady, messages, loading]);

  /* ── Save session ── */
  useEffect(() => {
    if (!recipient || messages.length === 0) return;
    saveSession({
      id: sessionIdRef.current,
      createdAt: new Date().toISOString(),
      recipient, messages, suggestions, reactions, chosen, lovedHistory,
    });
    setHistorySessions(listSessions());
  }, [messages, suggestions, reactions, chosen, recipient]);

  /* ── Show first bot message on mount ── */
  useEffect(() => {
    if (hasStarted.current) return; // stop React dev mode from running this twice
    hasStarted.current = true;

    const prefilledName     = searchParams.get("name")?.trim()     ?? "";
    const prefilledOccasion = searchParams.get("occasion")?.trim() ?? "";

    if (prefilledName && prefilledOccasion) {
      // We already know name + occasion — skip those two questions
      const g = { ...EMPTY, name: prefilledName, occasion: prefilledOccasion };
      setGathered(g);
      setShowTyping(true);
      setTimeout(() => {
        setConvMsgs([{
          from: "bot",
          text: stringsRef.current.greeting(prefilledName, tOccasion(langRef.current, prefilledOccasion)),
        }]);
        setShowTyping(false);
        triggerStep(2, g); // jump straight to "relation" (step 2)
      }, 700);
    } else if (prefilledName) {
      // We know the name — skip that question, start from occasion
      const g = { ...EMPTY, name: prefilledName };
      setGathered(g);
      triggerStep(1, g);
    } else {
      // Fresh start — ask everything from the beginning
      triggerStep(0, EMPTY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────── Onboarding engine ─────────────── */

  function triggerStep(idx: number, g: Gathered) {
    if (idx >= STEPS.length) return;
    setStepIndex(idx);
    setInputReady(false);
    setShowTyping(true);

    const delay = idx === 0 ? 600 : 900;
    setTimeout(() => {
      const question = stepsRef.current[idx].question(g);
      setConvMsgs((prev) => [...prev, { from: "bot", text: question }]);
      setShowTyping(false);
      setTimeout(() => setInputReady(true), 150);
      // auto-focus text input
      if (stepsRef.current[idx].inputType === "text") {
        setTimeout(() => textRef.current?.focus(), 250);
      }
    }, delay);
  }

  /* free-text "other" additions to multi-selects */
  const [otherText, setOtherText] = useState("");

  function advance(userAnswer: string, nextGathered: Gathered) {
    setInputReady(false);
    setTextInput("");
    setOtherText("");
    setPickedInterests([]);
    setPickedAvoid([]);
    setConvMsgs((prev) => [...prev, { from: "user", text: userAnswer }]);

    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      triggerStep(nextIdx, nextGathered);
    } else {
      startChat(nextGathered);
    }
  }

  function handleSkip() {
    advance("(skipped)", { ...gathered });
  }

  /* ─────────────── Step answer handlers ─────────────── */

  function answerText() {
    if (!textInput.trim()) return;
    const val = textInput.trim();
    const next = { ...gathered, name: val };
    setGathered(next);
    advance(val, next);
  }

  function answerAge() {
    const val = textInput.trim();
    if (!val || isNaN(Number(val))) return;
    const next = { ...gathered, ageRange: `${val} ${strings.years_old}` };
    setGathered(next);
    advance(`${val} ${strings.years_old}`, next);
  }

  function answerFreeText() {
    const val  = textInput.trim();
    const step = STEPS[stepIndex].id;
    let next   = { ...gathered };
    if (step === "wishlistHint")   next = { ...next, wishlistHint:   val };
    if (step === "interestDetail") next = { ...next, interestDetail: val };
    setGathered(next);
    advance(val || "(nothing specific)", next);
  }

  function answerButton(label: string, displayLabel?: string) {
    // label     = English value stored in gathered (used by the API)
    // displayLabel = translated text shown in the answer bubble
    let next = { ...gathered };
    const step = STEPS[stepIndex].id;
    if (step === "occasion")  next = { ...next, occasion: label };
    if (step === "relation")  next = { ...next, relation: label };
    if (step === "ageRange")  next = { ...next, ageRange: label };
    if (step === "style")     next = { ...next, style:    label };
    setGathered(next);
    advance(displayLabel ?? label, next);
  }

  function answerBudget(opt: { label: string; min: number; max: number }) {
    const next = { ...gathered, budgetMin: opt.min, budgetMax: opt.max };
    setGathered(next);
    advance(opt.label, next);
  }

  function answerMulti(which: "interests" | "avoid") {
    const picked = which === "interests" ? pickedInterests : pickedAvoid;

    // merge any typed "other" entries
    const extras = otherText.trim()
      ? otherText.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const allPicked = [...picked, ...extras];

    if (allPicked.length === 0 && which === "interests") {
      advance("(nothing specific)", gathered);
      return;
    }
    let next = { ...gathered };
    if (which === "interests") next = { ...next, interests: allPicked };
    if (which === "avoid")     next = { ...next, avoidTags: allPicked };
    setGathered(next);
    // Show translated labels in the answer bubble; keep English internally for the API
    const displayLabels = allPicked.map(l =>
      which === "interests" ? tInterest(lang, l) : tAvoid(lang, l)
    );
    advance(allPicked.length ? displayLabels.join(", ") : "(none)", next);
  }

  function answerUrl() {
    const url = textInput.trim();
    const next = { ...gathered, socialUrl: url };
    setGathered(next);
    advance(url || "(no link)", next);
  }

  /* ─────────────── Launch real chat ─────────────── */

  async function startChat(g: Gathered) {
    const r = gatheredToRecipient(g);
    setRecipient(r);
    setPhase("loading");
    setLoadingStage(0);

    // Cycle through loading stages so the user knows what's happening
    const hasSocial  = g.socialUrl.trim().length > 0;
    const stageDelay = hasSocial ? 8000 : 4000; // social = slower
    const stageTimer = setInterval(
      () => setLoadingStage(s => Math.min(s + 1, buildLoadingStages(g.name, hasSocial, strings).length - 1)),
      stageDelay
    );

    const firstMsg = buildFirstMessage(g, locale.currencySymbol);
    const userMsgs: ChatMessage[] = [{ role: "user", content: firstMsg }];
    setMessages(userMsgs);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipient: r, messages: userMsgs, reactions: {}, locale: { ...locale, language: lang } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ChatResponse = await res.json();
      const botMsgs: ChatMessage[] = data.message
        ? [{ role: "assistant", content: data.message }]
        : [];
      setMessages([...userMsgs, ...botMsgs]);
      if (data.suggestions?.length) setSuggestions(data.suggestions);
    } catch {
      setMessages([
        ...userMsgs,
        { role: "assistant", content: strings.error_generic },
      ]);
    }

    clearInterval(stageTimer);
    setPhase("chat");
    setTimeout(() => chatInputRef.current?.focus(), 300);
  }

  /* ─────────────── Ongoing chat ─────────────── */

  async function sendChatMessage() {
    if (!chatInput.trim() || loading || !recipient) return;
    const text = chatInput.trim();
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipient, messages: next, reactions, locale: { ...locale, language: lang } }),
      });
      const data: ChatResponse = await res.json();
      if (data.message)
        setMessages((p) => [...p, { role: "assistant", content: data.message }]);
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
        setActiveTab("gifts");
      }
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: strings.error_generic },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendRefined() {
    if (loading || !recipient) return;

    // ── Snapshot currently-loved items into persistent history ────────
    const newlyLoved = Object.entries(reactions)
      .filter(([, r]) => r === "love_it")
      .map(([id]) => suggestions.find((s) => s.id === id))
      .filter((s): s is GiftSuggestion => Boolean(s));

    if (newlyLoved.length) {
      setLovedHistory((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        return [...prev, ...newlyLoved.filter((s) => !existingIds.has(s.id))];
      });
    }

    // ── Build rich refinement message with full item context ──────────
    const fmt = (items: GiftSuggestion[]) =>
      items.map((s) => `"${s.title}" (${s.priceRange}) — ${s.description}`).join("\n  ");

    const lovedItems = Object.entries(reactions)
      .filter(([, r]) => r === "love_it")
      .map(([id]) => suggestions.find((s) => s.id === id))
      .filter((s): s is GiftSuggestion => Boolean(s));

    const ownedItems = Object.entries(reactions)
      .filter(([, r]) => r === "already_owned")
      .map(([id]) => suggestions.find((s) => s.id === id))
      .filter((s): s is GiftSuggestion => Boolean(s));

    const notRightItems = Object.entries(reactions)
      .filter(([, r]) => r === "not_their_style")
      .map(([id]) => suggestions.find((s) => s.id === id))
      .filter((s): s is GiftSuggestion => Boolean(s));

    const parts: string[] = [
      "Based on my reactions, please suggest 5 completely new and different gifts.",
      "",
    ];
    if (lovedItems.length) {
      parts.push(`❤️ LOVED (build on this vibe — same price tier, same aesthetic, fresh category):\n  ${fmt(lovedItems)}`);
    }
    if (ownedItems.length) {
      parts.push(`📦 ALREADY OWN (reveals their taste — DO NOT suggest this category again):\n  ${fmt(ownedItems)}`);
    }
    if (notRightItems.length) {
      parts.push(`👎 NOT RIGHT FOR THEM (avoid this entire style/category, not just these items):\n  ${fmt(notRightItems)}`);
    }
    parts.push(
      "",
      "Analyse the patterns above — price tier, aesthetic, category — then propose 5 gifts that amplify what was loved " +
      "while exploring fresh territory. Do not repeat any previous suggestions."
    );

    const text = parts.join("\n");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res  = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipient, messages: next, reactions, locale: { ...locale, language: lang } }),
      });
      const data: ChatResponse = await res.json();
      if (data.message)
        setMessages((p) => [...p, { role: "assistant", content: data.message }]);
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
        setReactions({}); // clear reactions so the user can react to the fresh batch
      }
    } catch {
      setMessages((p) => [
        ...p,
        { role: "assistant", content: strings.error_generic },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function react(id: string, r: ReactionType) {
    setReactions((p) => ({ ...p, [id]: p[id] === r ? null : r }));
  }

  function copyAll() {
    const text = suggestions
      .map((s, i) => `${i+1}. ${s.title} (${s.priceRange})\n   ${s.description}\n   Why: ${s.reason}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }

  function priceTier(pr: string): "budget" | "mid" | "premium" {
    const m = pr.match(/\$?(\d+)/);
    if (!m || !recipient) return "mid";
    const low = parseInt(m[1]);
    if (low <= recipient.budgetMin * 1.3) return "budget";
    if (low >= recipient.budgetMax * 0.75) return "premium";
    return "mid";
  }

  function newSearch() {
    setPhase("onboarding");
    setStepIndex(0);
    setConvMsgs([]);
    setGathered(EMPTY);
    setPickedInterests([]);
    setPickedAvoid([]);
    setTextInput("");
    setOtherText("");
    setMessages([]);
    setSuggestions([]);
    setReactions({});
    setChosen(null);
    setRecipient(null);
    sessionIdRef.current = crypto.randomUUID();
    setHistoryOpen(false);
    router.push("/chat");
    setTimeout(() => triggerStep(0, EMPTY), 50);
  }

  function restoreSession(s: Session) {
    sessionIdRef.current = s.id;
    setRecipient(s.recipient);
    setMessages(s.messages);
    setSuggestions(s.suggestions);
    setReactions(s.reactions);
    setChosen(s.chosen);
    setLovedHistory(s.lovedHistory ?? []);
    setPhase("chat");
    setHistoryOpen(false);
  }

  /* ─────────────────────── Step input renderer ─────────────────────────── */

  function renderInput() {
    if (!inputReady) return null;
    const step = STEPS[stepIndex];

    if (step.inputType === "text") return (
      <form onSubmit={(e) => { e.preventDefault(); answerText(); }}
        className="flex gap-2 mt-4 animate-fade-in-up">
        <input ref={textRef} value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={strings.type_placeholder}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
        />
        <button type="submit" disabled={!textInput.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
          {strings.next_btn}
        </button>
      </form>
    );

    if (step.inputType === "age") return (
      <form onSubmit={(e) => { e.preventDefault(); answerAge(); }}
        className="flex gap-2 mt-4 animate-fade-in-up items-center">
        <input
          type="number" min="1" max="120"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={strings.type_age_placeholder}
          className="w-32 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white text-center text-base font-medium"
          autoFocus
        />
        <span className="text-slate-400 text-sm">{strings.years_old}</span>
        <button type="submit" disabled={!textInput.trim() || isNaN(Number(textInput))}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all ml-auto">
          {strings.next_btn}
        </button>
      </form>
    );

    if (step.inputType === "grid") {
      const opts =
        step.id === "occasion" ? OCCASIONS :
        step.id === "relation" ? RELATIONS : [];
      return (
        <div className="mt-4 animate-fade-in-up">
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => {
              const displayLabel =
                step.id === "occasion" ? tOccasion(lang, o.label) :
                step.id === "relation" ? tRelation(lang, o.label) :
                o.label;
              return (
                <button key={o.label} onClick={() => answerButton(o.label, displayLabel)}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 text-sm px-3.5 py-2 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5">
                  <span>{o.emoji}</span> {displayLabel}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step.inputType === "budget") return (
      <div className="mt-4 animate-fade-in-up">
        <div className="flex flex-wrap gap-2">
          {budgetOptions.map((o) => (
            <button key={o.label} onClick={() => answerBudget(o)}
              className="bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5">
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );

    if (step.inputType === "multiselect") {
      const which: "interests" | "avoid" =
        step.id === "interests" ? "interests" : "avoid";
      const opts      = which === "interests" ? INTERESTS : AVOID_OPTIONS;
      const picked    = which === "interests" ? pickedInterests : pickedAvoid;
      const setPicked = which === "interests" ? setPickedInterests : setPickedAvoid;
      const requireOne = which === "interests";

      return (
        <div className="mt-4 animate-fade-in-up space-y-3">
          <div className="flex flex-wrap gap-2">
            {opts.map((o) => {
              const active = picked.includes(o.label);
              const displayLabel = which === "interests" ? tInterest(lang, o.label) : tAvoid(lang, o.label);
              return (
                <button key={o.label}
                  onClick={() => setPicked((p) =>
                    active ? p.filter((x) => x !== o.label) : [...p, o.label]
                  )}
                  className={`flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl border transition-all duration-150 shadow-sm ${
                    active
                      ? "bg-orange-500 border-orange-500 text-white shadow-orange-200"
                      : "bg-white border-slate-200 text-slate-700 hover:border-orange-200 hover:bg-orange-50"
                  }`}>
                  {o.emoji} {displayLabel}
                </button>
              );
            })}
          </div>
          {/* "Other" free-text input */}
          <div className="flex gap-2 items-center">
            <input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder={strings.other_placeholder}
              className="flex-1 border border-dashed border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-100 bg-white"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => answerMulti(which)}
              disabled={picked.length === 0 && !otherText.trim() && requireOne}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all">
              {(picked.length > 0 || otherText.trim())
                ? strings.confirm_n_selected(picked.length + (otherText.trim() ? otherText.split(",").filter(s=>s.trim()).length : 0))
                : requireOne ? strings.pick_at_least_one : strings.none_apply}
            </button>
            {!requireOne && (
              <button onClick={handleSkip}
                className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all">
                {strings.skip}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (step.inputType === "style-grid") return (
      <div className="mt-4 animate-fade-in-up">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STYLES.map((v) => {
            const sd = tStyleDisplay(lang, v.label);
            return (
              <button key={v.label} onClick={() => answerButton(v.label, sd.label)}
                className="flex flex-col items-start bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/60 rounded-xl p-3 text-left transition-all duration-150 shadow-sm hover:shadow-md hover:-translate-y-0.5 group">
                <span className="text-xl mb-1">{v.emoji}</span>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors leading-tight">{sd.label}</span>
                <span className="text-xs text-slate-400 leading-tight mt-0.5">{sd.sub}</span>
              </button>
            );
          })}
        </div>
      </div>
    );

    if (step.inputType === "freetext") return (
      <div className="mt-4 animate-fade-in-up space-y-2">
        <textarea value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={strings.wishlist_placeholder}
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white resize-none"
        />
        <div className="flex gap-2">
          <button onClick={answerFreeText} disabled={!textInput.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            {textInput.trim() ? strings.great_noted : strings.add_hint_first}
          </button>
          <button onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2 rounded-xl border border-slate-200 transition-all">
            {strings.skip}
          </button>
        </div>
        <p className="text-xs text-slate-400">{strings.hint_quality}</p>
      </div>
    );

    if (step.inputType === "url") return (
      <div className="mt-4 animate-fade-in-up space-y-2">
        <div className="flex gap-2">
          <input value={textInput} onChange={(e) => setTextInput(e.target.value)}
            placeholder={strings.type_url_placeholder}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          />
          <button onClick={answerUrl}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            {textInput.trim() ? strings.next_btn : strings.skip}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {strings.url_hint}
        </p>
      </div>
    );
  }

  /* ───────────────────────── Progress dots ───────────────────────────── */

  const progress = phase === "onboarding"
    ? Math.round((stepIndex / STEPS.length) * 100)
    : 100;

  /* ═══════════════════════════ ONBOARDING UI ══════════════════════════ */

  if (phase === "onboarding" || phase === "loading") {
    return (
      <div className="min-h-screen bg-[#FDFAF7] flex flex-col">
        {/* Header — 3-col grid keeps logo centred regardless of button widths */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 grid grid-cols-[1fr_auto_1fr] items-center px-5 py-3 gap-2">
          {/* Left */}
          <div className="flex items-center">
            <Link href="/" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
              {strings.back_home}
            </Link>
          </div>
          {/* Centre */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm flex-shrink-0">
                <GiftConciergeIcon size={15} />
              </div>
              <span className="font-display text-lg font-semibold text-slate-700">Gift Concierge</span>
            </div>
            <div className="w-28 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center justify-end gap-2">
            {nativeLang !== "en" && (
              <button
                onClick={() => setLang(l => l === "en" ? nativeLang : "en")}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-all"
                title={lang === "en" ? strings.switch_to_local : strings.switch_to_english}>
                <span>{lang === "en" ? "🇬🇧" : LANG_FLAGS[nativeLang] ?? "🌍"}</span>
                <span>{lang === "en" ? "EN" : nativeLang.toUpperCase()}</span>
              </button>
            )}
            {historySessions.length > 0 && (
              <button onClick={() => { setHistorySessions(listSessions()); setHistoryOpen(true); }}
                className="text-slate-400 hover:text-slate-600 text-sm transition-colors">
                {strings.history}
              </button>
            )}
          </div>
        </header>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4 pb-32">
          {convMsgs.map((m, i) => (
            <div key={i} className={`flex items-end gap-2.5 ${m.from === "user" ? "flex-row-reverse" : ""} animate-fade-in-up`}>
              {m.from === "bot" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                </div>
              )}
              <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                m.from === "bot"
                  ? "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                  : "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm"
              }`}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {showTyping && (
            <div className="flex items-end gap-2.5 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full dot-1" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full dot-2" />
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full dot-3" />
              </div>
            </div>
          )}

          {/* Loading state between onboarding and chat */}
          {phase === "loading" && (() => {
            const hasSocial = gathered.socialUrl.trim().length > 0;
            const stages    = buildLoadingStages(gathered.name, hasSocial, strings);
            const stage     = stages[Math.min(loadingStage, stages.length - 1)];
            return (
              <div className="flex items-end gap-2.5 animate-fade-in pl-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm max-w-[82%] space-y-3">
                  {/* Current stage */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{stage.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{stage.text}</span>
                  </div>

                  {/* Animated progress bar */}
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden w-48">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full animate-loading-bar" />
                  </div>

                  {/* Stages list */}
                  <div className="space-y-1">
                    {stages.map((s, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-all duration-500 ${
                        i < loadingStage  ? "text-emerald-500"   :
                        i === loadingStage ? "text-slate-700 font-medium" :
                        "text-slate-300"
                      }`}>
                        <span>{i < loadingStage ? "✓" : i === loadingStage ? "›" : "·"}</span>
                        <span>{s.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Time warning only when social media linked */}
                  {hasSocial && (
                    <p className="text-xs text-slate-400 border-t border-slate-50 pt-2">
                      {strings.loading_social_wait}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Current step input — rendered inline after messages */}
          {phase === "onboarding" && (
            <div className="pl-10">
              {renderInput()}
            </div>
          )}

          <div ref={bottomRef} className="h-1" />
        </div>

        {historyOpen && (
          <HistoryDrawer
            sessions={historySessions}
            strings={strings}
            onRestore={restoreSession}
            onDelete={(id) => { deleteSession(id); setHistorySessions(listSessions()); }}
            onClose={() => setHistoryOpen(false)}
          />
        )}
      </div>
    );
  }

  /* ═══════════════════════════ CHAT UI ════════════════════════════════ */

  return (
    <div className="h-screen flex flex-col bg-[#FDFAF7] overflow-hidden">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3 z-20 flex-shrink-0">
        <div className="flex items-center">
          <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors text-sm">
            {strings.back_home}
          </Link>
        </div>
        <div className="min-w-0 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm flex-shrink-0">
              <GiftConciergeIcon size={15} />
            </div>
            <span className="font-display text-lg font-semibold text-slate-800 truncate">
              {recipient?.name ? strings.gift_for(recipient.name) : "Gift Concierge"}
            </span>
          </div>
          {recipient?.occasion && (
            <div className="text-xs text-orange-400 font-medium mt-0.5">{tOccasion(lang, recipient.occasion)}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          {nativeLang !== "en" && (
            <button
              onClick={() => setLang(l => l === "en" ? nativeLang : "en")}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-500 hover:text-orange-600 transition-all"
              title={lang === "en" ? strings.switch_to_local : strings.switch_to_english}>
              <span>{lang === "en" ? "🇬🇧" : LANG_FLAGS[nativeLang] ?? "🌍"}</span>
              <span className="hidden sm:inline">{lang === "en" ? "EN" : nativeLang.toUpperCase()}</span>
            </button>
          )}
          <Link href="/history"
            className="text-xs text-slate-500 hover:text-orange-500 transition-colors border border-slate-200 hover:border-orange-200 rounded-lg px-2.5 py-1.5 leading-none flex items-center gap-1">
            ❤️ <span className="hidden sm:inline">{strings.saved_items}</span>
          </Link>
          <button onClick={newSearch}
            className="text-xs text-slate-500 hover:text-orange-500 transition-colors border border-slate-200 hover:border-orange-200 rounded-lg px-2.5 py-1.5 leading-none">
            + {strings.new_search}
          </button>
          <button onClick={() => { setHistorySessions(listSessions()); setHistoryOpen(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all" title={strings.history}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="5.8" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M7.5 4.5V7.5l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Suggestions — full width ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Sub-header */}
        <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-800 leading-tight">
              {suggestions.length > 0
                ? `${strings.gift_ideas}${recipient?.name ? ` · ${recipient.name}` : ""}`
                : strings.gift_ideas}
            </h2>
            {suggestions.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">{strings.n_picks(suggestions.length)} · {locale.countryCode} · {locale.currency}</p>
            )}
          </div>
          {suggestions.length > 0 && (
            <button onClick={copyAll}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-1.5">
              {copied ? <span className="text-emerald-500 font-medium">{strings.copied}</span> : strings.copy_all}
            </button>
          )}
        </div>

        {/* ── Cards grid ── */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
              <div className="mb-4 opacity-15 select-none">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
              </div>
              {/* Show the last assistant message if available (e.g. error or explanation) */}
              {messages.filter(m => m.role === "assistant").length > 0 ? (
                <div className="max-w-sm space-y-3">
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {messages.filter(m => m.role === "assistant").at(-1)!.content}
                  </p>
                  <p className="text-slate-400 text-xs">{strings.chat_placeholder}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{strings.no_suggestions}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {suggestions.map((s) => {
                const tier = priceTier(s.priceRange);
                const isChosen = chosen === s.id;
                const productLink = s.officialLink ?? s.amazonLink ?? s.link;
                const imgSrc = productLink
                  ? `/api/product-image?url=${encodeURIComponent(productLink)}&q=${encodeURIComponent(s.title)}`
                  : `/api/product-image?q=${encodeURIComponent(s.title)}`;

                return (
                  <div key={s.id} className={`flex flex-col bg-white rounded-2xl overflow-hidden border transition-all duration-300 ${
                    isChosen
                      ? "border-emerald-200 ring-2 ring-emerald-100 shadow-lg"
                      : "border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1"
                  }`}>

                    {/* ── Image — full width, tall ── */}
                    <div className="relative w-full h-52 bg-slate-100 overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={s.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Subtle bottom scrim */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                      {/* Price badge — bottom left */}
                      <span className={`absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm ${
                        tier === "budget"   ? "bg-emerald-500/90 text-white" :
                        tier === "premium"  ? "bg-orange-500/90 text-white"  :
                                              "bg-amber-400/90 text-white"
                      }`}>{s.priceRange}</span>

                      {/* Chosen badge — bottom right */}
                      {isChosen && (
                        <span className="absolute bottom-3 right-3 text-[10px] font-bold text-white bg-emerald-500/90 px-2.5 py-1 rounded-full shadow-md backdrop-blur-sm">
                          {strings.chosen}
                        </span>
                      )}
                    </div>

                    {/* ── Content ── */}
                    <div className="p-4 flex flex-col flex-1">
                      {/* Title */}
                      <h3 className="font-display text-[1.1rem] font-semibold leading-snug text-slate-800 mb-1">
                        {s.title}
                      </h3>

                      {/* Description — secondary, small */}
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4 flex-1">
                        {s.description}
                      </p>

                      {/* ── Reactions ── */}
                      <p className="text-[10px] text-slate-300 uppercase tracking-widest mb-1.5 font-medium">
                        {strings.react_hint}
                      </p>
                      <div className="flex gap-2 mb-3">
                        {(["love_it", "already_owned", "not_their_style"] as ReactionType[]).map((rv) => {
                          const meta: Record<string, {emoji: string; label: string}> = {
                            love_it:         { emoji: "❤️", label: strings.react_love      },
                            already_owned:   { emoji: "📦", label: strings.react_owned     },
                            not_their_style: { emoji: "👎", label: strings.react_not_style },
                          };
                          const r = meta[rv as string];
                          return (
                            <button key={rv} onClick={() => react(s.id, rv)}
                              className={`flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-xl border transition-all duration-150 ${
                                reactions[s.id] === rv
                                  ? "bg-orange-50 border-orange-300 text-orange-600 font-medium"
                                  : "bg-slate-50 border-slate-200 text-slate-400 hover:border-orange-200 hover:text-orange-500"
                              }`}>
                              <span>{r.emoji}</span>
                              <span className="hidden sm:inline">{r.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Links ── */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <a href={addAffiliateTag(s.amazonLink ?? `https://www.${locale.amazonDomain}/s?k=${encodeURIComponent(s.title)}`)}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-500 hover:text-[#FF9900] transition-colors">
                            🛒 Buy on Amazon
                          </a>
                        </div>
                        {isChosen ? (
                          <button onClick={() => setChosen(null)}
                            className="text-xs font-semibold text-emerald-500 hover:text-slate-400 transition-colors">
                            {strings.chosen}
                          </button>
                        ) : (
                          <button onClick={() => setChosen(s.id)}
                            className="text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 px-3 py-1.5 rounded-full transition-all shadow-sm">
                            {strings.choose_this}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="bg-white border-t border-slate-100 flex-shrink-0">

        {/* Reaction strip + Refine button — only when reactions exist */}
        {Object.values(reactions).some(Boolean) && (
          <div className="px-6 pt-3 pb-0 max-w-5xl mx-auto w-full">
            <div className="flex items-center justify-between gap-4 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
              {/* Reaction counts */}
              <div className="flex items-center gap-3 text-sm flex-wrap">
                {Object.values(reactions).filter((r) => r === "love_it").length > 0 && (
                  <span className="flex items-center gap-1 text-rose-500 font-medium">
                    ❤️ {Object.values(reactions).filter((r) => r === "love_it").length}
                  </span>
                )}
                {Object.values(reactions).filter((r) => r === "already_owned").length > 0 && (
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    📦 {Object.values(reactions).filter((r) => r === "already_owned").length}
                  </span>
                )}
                {Object.values(reactions).filter((r) => r === "not_their_style").length > 0 && (
                  <span className="flex items-center gap-1 text-slate-500 font-medium">
                    👎 {Object.values(reactions).filter((r) => r === "not_their_style").length}
                  </span>
                )}
                <span className="text-slate-400 text-xs hidden sm:inline">— {strings.refine_hint}</span>
              </div>

              {/* Refine button */}
              <button
                onClick={sendRefined}
                disabled={loading}
                className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-sm transition-all">
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full dot-1" />
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full dot-2" />
                    <span className="w-1.5 h-1.5 bg-white/70 rounded-full dot-3" />
                  </span>
                ) : strings.refine_btn}
              </button>
            </div>
          </div>
        )}

        {/* Free-text input row */}
        <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
          className="flex gap-3 max-w-5xl mx-auto px-6 py-3">
          <input ref={chatInputRef} value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={loading}
            placeholder={strings.chat_placeholder}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent bg-slate-50 focus:bg-white transition-all"
          />
          <button type="submit" disabled={!chatInput.trim() || loading}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all shadow-sm flex-shrink-0">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-white/70 rounded-full dot-1" />
                <span className="w-1 h-1 bg-white/70 rounded-full dot-2" />
                <span className="w-1 h-1 bg-white/70 rounded-full dot-3" />
              </span>
            ) : strings.send}
          </button>
        </form>
      </div>

      {historyOpen && (
        <HistoryDrawer
          sessions={historySessions}
          strings={strings}
          onRestore={restoreSession}
          onDelete={(id) => { deleteSession(id); setHistorySessions(listSessions()); }}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

/* ──────────────────── History drawer ────────────────────────────── */

function HistoryDrawer({ sessions, strings, onRestore, onDelete, onClose }: {
  sessions: Session[];
  strings: ReturnType<typeof t>;
  onRestore: (s: Session) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed left-0 top-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-left">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{strings.history_title}</h2>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {sessions.length === 0
            ? <p className="text-slate-400 text-sm text-center py-12">{strings.history_empty}</p>
            : sessions.map((s) => (
              <div key={s.id} className="group flex items-center gap-1">
                <button onClick={() => onRestore(s)}
                  className="flex-1 text-left px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors">
                  <div className="text-sm font-medium text-slate-700 group-hover:text-orange-600 truncate">
                    ✦ {s.recipient.name || "Unknown"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {s.recipient.occasion} · {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>
                  {s.suggestions.length > 0 && (
                    <div className="text-xs text-amber-400 mt-0.5">{s.suggestions.length} suggestion{s.suggestions.length !== 1 ? "s" : ""}</div>
                  )}
                </button>
                <button onClick={() => onDelete(s.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-300 hover:text-orange-400 hover:bg-orange-50 transition-all">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1.5 3h9M4 3V1.5h4V3M5 5.5v3.5M7 5.5v3.5M2 3l.75 6.5a1 1 0 001 .875h4.5a1 1 0 001-.875L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))
          }
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-300 text-center">{strings.history_footer}</p>
        </div>
      </div>
    </>
  );
}
