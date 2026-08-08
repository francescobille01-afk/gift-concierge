"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { GiftSuggestion, ChatResponse, UserLocale, ChatMessage, ProfileSignal, AdaptiveQuestionResult } from "@/lib/types";

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bg:     "#f3ebe1",
  brand:  "linear-gradient(160deg,#203746 0%,#294b59 60%,#152b38 100%)",
  maroon: "#df604f",
  terra:  "#294b59",
  gold:   "#ef735f",
  goldS:  "#f0e3d2",
  ink:    "#2a211d",
  body:   "#3a2e26",
  label:  "#6b5b4d",
  label2: "#5a4a40",
  muted:  "#9a8674",
  muted2: "#b3a292",
  muted3: "#a8957f",
  muted4: "#7a6857",
  border: "#ece0d2",
  bord2:  "#e9ddd0",
  bord3:  "#e3d4c2",
  bord4:  "#e6d8c8",
  bord5:  "#e0d0bd",
};
const N = {
  navy:   "#203746",
  navy2:  "#294b59",
  navy3:  "#152b38",
  coral:  "#ef735f",
  peach:  "#ffc19f",
  cream:  "#fff4e8",
  mist:   "#d7e1df",
};
const DISPLAY = "'Outfit', sans-serif";
const BODY    = "'Hanken Grotesk', sans-serif";

/* ─── Landing hero carousel — real editorial photography (Unsplash CDN),
   picked per card so the shot actually matches the gift described. Portrait
   4:5 crops, served pre-sized so the cards stay sharp at hero scale. ─── */
const GIFT_SHOWCASE = [
  { photo:"https://plus.unsplash.com/premium_photo-1664970900335-a7c99062bc51?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Caffè", title:"Set da degustazione specialty", recipient:"Per Giulia", budget:"€40-60", occasion:"Compleanno", interest:"Caffè" },
  { photo:"https://images.unsplash.com/photo-1622260614153-03223fb72052?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Outdoor", title:"Zaino da trekking tecnico", recipient:"Per Luca", budget:"€90-130", occasion:"Laurea", interest:"Trekking" },
  { photo:"https://images.unsplash.com/photo-1701115109838-c4a72a2b0de4?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Foto", title:"Fotocamera istantanea", recipient:"Per Marta", budget:"€70-100", occasion:"Anniversario", interest:"Fotografia" },
  { photo:"https://images.unsplash.com/photo-1764557159396-419b85356035?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Tech", title:"Cuffie over-ear minimal", recipient:"Per Andrea", budget:"€120-160", occasion:"Natale", interest:"Musica" },
  { photo:"https://images.unsplash.com/photo-1762755647813-017e128a4ba0?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Casa", title:"Monstera in vaso di terracotta", recipient:"Per Sofia", budget:"€30-45", occasion:"Nuova casa", interest:"Piante" },
  { photo:"https://images.unsplash.com/photo-1601148071764-8c3f50e9ab20?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Musica", title:"Giradischi da salotto", recipient:"Per Marco", budget:"€150-220", occasion:"Anniversario", interest:"Vinili" },
  { photo:"https://images.unsplash.com/photo-1743110727935-0dc8abf01509?auto=format&fit=crop&crop=entropy&w=760&h=680&q=80",  category:"Cucina", title:"Coltello da chef forgiato", recipient:"Per Elena", budget:"€80-120", occasion:"Nuova casa", interest:"Cucina" },
];

/* Phase 3 shows real gift cards, not placeholders — the same three the
   example recipient in phase 1 would actually get. */
const RESULT_PREVIEW = [
  GIFT_SHOWCASE[1], // zaino da trekking  → "fa trekking ogni domenica"
  GIFT_SHOWCASE[6], // coltello da chef   → "cucina spesso"
  GIFT_SHOWCASE[4], // monstera            → "odia gli oggetti inutili"
];

/* Phase 1's example message. Typed out one character at a time from JS —
   a CSS reveal can only wipe the finished text, which reads as a shutter
   opening rather than as somebody writing. */
const PHASE_ONE_SENTENCE = "“Francesco si è appena trasferito e ha un terrazzo tutto suo. Va in montagna ogni weekend e la domenica cucina per gli amici.”";
const PHASE_ONE_TYPE_MS = 19;

/* Phase 2's worked example: what the message in phase 1 gets classified
   into, and what the analysis weighs those classes out to. */
const ENGINE_TOKENS = [
  { kind:"contesto",  label:"casa nuova" },
  { kind:"spazio",    label:"terrazzo" },
  { kind:"passione",  label:"montagna" },
  { kind:"ritmo",     label:"ogni weekend" },
  { kind:"abitudine", label:"cucina per altri" },
];
/* How long each stop holds before it hands over. Phase 1 waits for the
   sentence to finish typing; 2 and 3 resolve sooner so they don't linger.
   Kept in step with the --dwell values on each phase in the stylesheet. */
const PHASE_DWELL_MS = [4600, 3400, 3400];
const HERO_DWELL_MS = 3800;

/* The five ideas that spill out of the parcel once it opens. */
const PARCEL_POPS = [GIFT_SHOWCASE[1], GIFT_SHOWCASE[6], GIFT_SHOWCASE[0], GIFT_SHOWCASE[4]];

const ENGINE_RESULTS = [
  { label:"Outdoor",  score:88 },
  { label:"Terrazzo", score:71 },
  { label:"Cucina",   score:58 },
  { label:"Casa",     score:39 },
  { label:"Tech",     score:24 },
  { label:"Moda",     score:11 },
];
/* Where the "idee valutate" counter lands, and how long it takes. */
const ANALYSED_TARGET = 1284;
const ANALYSED_MS = 1500;

const AMAZON_TAG = "gifty0de-21";
// Testing phase: we only have an amazon.it affiliate link, so force every
// Amazon URL onto that domain regardless of which Amazon TLD it came from.
function addAffiliateTag(url: string): string {
  if (!url || !url.includes("amazon.")) return url;
  try {
    const u = new URL(url);
    if (u.hostname !== "www.amazon.it" && u.hostname !== "amazon.it") {
      u.hostname = "www.amazon.it";
    }
    u.searchParams.set("tag", AMAZON_TAG);
    return u.toString();
  } catch { return url; }
}

/* ─── Style helpers ─────────────────────────────────────────── */
function chipSt(active: boolean): React.CSSProperties {
  return active
    ? { padding:"11px 17px", borderRadius:999, border:`1.5px solid ${C.maroon}`, background:C.maroon, color:"#fff", font:`600 14.5px ${BODY}`, cursor:"pointer", boxShadow:"0 4px 12px rgba(124,63,63,.22)", transition:"all .15s" }
    : { padding:"11px 17px", borderRadius:999, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.label2, font:`600 14.5px ${BODY}`, cursor:"pointer", transition:"all .15s" };
}
function tileSt(active: boolean): React.CSSProperties {
  return active
    ? { display:"flex", flexDirection:"column", alignItems:"center", gap:7, padding:"18px 10px", borderRadius:15, border:`1.5px solid ${C.maroon}`, background:"#fdf6ef", color:C.maroon, font:`600 13.5px ${BODY}`, cursor:"pointer", transition:"all .15s", boxShadow:"0 6px 16px rgba(124,63,63,.14)" }
    : { display:"flex", flexDirection:"column", alignItems:"center", gap:7, padding:"18px 10px", borderRadius:15, border:`1.5px solid ${C.bord2}`, background:"#fff", color:C.label2, font:`600 13.5px ${BODY}`, cursor:"pointer", transition:"all .15s" };
}
const btnPrimary: React.CSSProperties = { padding:"13px 26px", borderRadius:12, border:"none", background:C.maroon, color:"#fff", font:`600 15.5px ${BODY}`, cursor:"pointer", boxShadow:"0 6px 18px rgba(124,63,63,.28)", transition:"all .15s" };
const btnDisabled: React.CSSProperties = { padding:"13px 26px", borderRadius:12, border:"none", background:C.bord3, color:C.muted2, font:`600 15.5px ${BODY}`, cursor:"not-allowed", transition:"all .15s" };

/* ─── Gift SVG ───────────────────────────────────────────────── */
function GiftSVG({ size = 20, fill = "#5e2e2e" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 7h-3.2a2.6 2.6 0 1 0-4.8 0 2.6 2.6 0 1 0-4.8 0H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-6.6-1.4a1 1 0 1 1 1 1h-1v-1Zm-3.8-1a1 1 0 0 1 1 1v1h-1a1 1 0 0 1 0-2Z" fill={fill} />
    </svg>
  );
}

/* ─── Locales ────────────────────────────────────────────────── */
const LANGS = [
  { code:"EN", t:"en", flag:"🇺🇸", name:"English (US)", sym:"$",  currency:"USD", country:"United States" },
  { code:"EN", t:"en", flag:"🇬🇧", name:"English (UK)", sym:"£",  currency:"GBP", country:"United Kingdom" },
  { code:"IT", t:"it", flag:"🇮🇹", name:"Italiano",     sym:"€",  currency:"EUR", country:"Italia" },
  { code:"FR", t:"fr", flag:"🇫🇷", name:"Français",     sym:"€",  currency:"EUR", country:"France" },
  { code:"DE", t:"de", flag:"🇩🇪", name:"Deutsch",      sym:"€",  currency:"EUR", country:"Deutschland" },
  { code:"ES", t:"es", flag:"🇪🇸", name:"Español",      sym:"€",  currency:"EUR", country:"España" },
  { code:"PT", t:"pt", flag:"🇵🇹", name:"Português",    sym:"€",  currency:"EUR", country:"Portugal" },
];

type TKey = "en" | "it" | "fr" | "de" | "es" | "pt";

const LANDING_FORM_COPY: Record<TKey, {
  collapsedPrompt: string;
  nameLabel: string;
  namePlaceholder: string;
  occasionLabel: string;
  occasionPlaceholder: string;
  budgetLabel: string;
  sheetTitle: string;
  sheetSub: string;
  cta: string;
}> = {
  en: { collapsedPrompt:"Start here", nameLabel:"Recipient's name", namePlaceholder:"e.g. Giulia", occasionLabel:"Occasion", occasionPlaceholder:"e.g. Birthday", budgetLabel:"Budget", sheetTitle:"Let's start with the essentials", sheetSub:"Three details, then you can tell Gifty everything you know.", cta:"Continue" },
  it: { collapsedPrompt:"Inizia da qui", nameLabel:"Nome del destinatario", namePlaceholder:"Es. Giulia", occasionLabel:"Occasione", occasionPlaceholder:"Es. Compleanno", budgetLabel:"Budget", sheetTitle:"Partiamo dalle cose essenziali", sheetSub:"Tre informazioni, poi potrai raccontare a Gifty tutto quello che sai.", cta:"Continua" },
  fr: { collapsedPrompt:"Commencez ici", nameLabel:"Prénom du destinataire", namePlaceholder:"Ex. Giulia", occasionLabel:"Occasion", occasionPlaceholder:"Ex. Anniversaire", budgetLabel:"Budget", sheetTitle:"Commençons par l'essentiel", sheetSub:"Trois informations, puis racontez à Gifty tout ce que vous savez.", cta:"Continuer" },
  de: { collapsedPrompt:"Hier starten", nameLabel:"Name der Person", namePlaceholder:"z. B. Giulia", occasionLabel:"Anlass", occasionPlaceholder:"z. B. Geburtstag", budgetLabel:"Budget", sheetTitle:"Beginnen wir mit dem Wesentlichen", sheetSub:"Drei Angaben, danach kannst du Gifty alles erzählen, was du weißt.", cta:"Weiter" },
  es: { collapsedPrompt:"Empieza aquí", nameLabel:"Nombre del destinatario", namePlaceholder:"Ej. Giulia", occasionLabel:"Ocasión", occasionPlaceholder:"Ej. Cumpleaños", budgetLabel:"Presupuesto", sheetTitle:"Empecemos por lo esencial", sheetSub:"Tres datos y después podrás contarle a Gifty todo lo que sabes.", cta:"Continuar" },
  pt: { collapsedPrompt:"Comece aqui", nameLabel:"Nome do destinatário", namePlaceholder:"Ex. Giulia", occasionLabel:"Ocasião", occasionPlaceholder:"Ex. Aniversário", budgetLabel:"Orçamento", sheetTitle:"Vamos começar pelo essencial", sheetSub:"Três dados e depois pode contar à Gifty tudo o que sabe.", cta:"Continuar" },
};

interface InterestDeepDiveConfig {
  detailQ: string; detailPlaceholder: string;
  contextQ: string; contextOpts: string[];
  levelQ: string; levelOpts: string[];
  brandQ: string; brandPlaceholder: string;
}

interface InterestDeepDiveAnswer {
  detail: string;
  context: string;
  level: string;
  brand: string;
}

interface Tr {
  nav: string[];
  h1a: string; h1b: string; intro: string;
  bFree: string; bBudget: string; bSocial: string;
  proofPre: string; proofPost: string;
  stepWord: string; ofWord: string;
  stepNames: string[];
  conciergeLabel: string;
  msgs: (n: string) => string[];
  namePlaceholder: string; nameHelp: string;
  relTitle: string; ageQ: string; genderQ: string;
  yrs: string;
  genderOpts: string[];
  relOtherPlaceholder: string;
  occQ: string; occPlaceholder: string;
  otherLabel: string; customPlaceholder: string;
  pickAtLeast: string; selectedWord: string;
  budgetTitle: string;
  detailsPlaceholder: string;
  promptChips: string[];
  back: string; continue: string; findGifts: string;
  loadingTitle: string; loadingLines: string[];
  curatedTag: string;
  headline: (n: number, name: string, occ: string) => string;
  sub: (b: string, c: string) => string;
  startOver: string; sortLabel: string; sortOpts: string[];
  viewGift: string; refine: string; matchWord: string;
  histTitle: string; histSub: string;
  viewResults: string; histEmptyTitle: string; histEmptySub: string; startSearch: string;
  giftsWord: string; budgetWord: string;
  whenNow: string; whenD2: string; whenW1: string; whenW3: string;
  histRow: (name: string, occ: string) => string;
  favTitle: string; favSub: string;
  favEmptyTitle: string; favEmptySub: string; findGiftsBtn: string;
  contactTitle: string; contactSub: string;
  yourName: string; email: string; help: string; namePh: string; msgPh: string;
  sendMsg: string; sentTitle: string; sentSub: string; sendAnother: string; orEmail: string;
  occ: Record<string, string>; occFallback: string;
  rel: string[];
  intr: string[];
  deepDive: Partial<Record<number, InterestDeepDiveConfig>>;
  buyOnAmazon: string;
  saveFav: string; savedFav: string; savedSearch: string;
  signInTitle: string; signInSub: string;
  continueGoogle: string; continueEmail: string; continueGuest: string;
  orWord: string; termsNote: string; waitMsg: string;
  checkEmail: string; codeSent: string; verifyCode: string; verifying: string;
  disclaimerAmazon: string; disclaimerPrice: string;
  landingKicker: string; landingSub: string; landingBadge: string;
  howStep1Title: string; howStep1Desc: string;
  howStep2Title: string; howStep2Desc: string;
  howStep3Title: string; howStep3Desc: string;
  card1Meta: string; card1Title: string; card1Price: string;
  card2Meta: string; card2Title: string; card2Price: string;
  chatBarPrompt: string; chatBarLabel: string;
  stepCaption1: string; stepCaption2: string; stepCaption3: string;
}

const TR: Record<TKey, Tr> = {
  en: {
    nav: ["Home","Favorites"],
    h1a:"The perfect gift,", h1b:"found for you.",
    intro:"Answer a few quick questions and Gifty — your personal concierge — will find the perfect gift for you.",
    bFree:"Free · No account · ~2 minutes", bBudget:"Every budget, every occasion", bSocial:"Deeply personalised to their tastes",
    proofPre:"Loved by", proofPost:"thoughtful gifters",
    stepWord:"Step", ofWord:"of",
    stepNames:["The recipient","Budget & occasion","Interests","Let's get specific"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Who are we finding a gift for?","What's your budget, and for what occasion?","What are they into?","Let's get a bit more specific — this makes a huge difference."],
    namePlaceholder:"Their first name…", nameHelp:"The name helps Gifty figure out their likely gender and personalise suggestions accordingly.",
    relTitle:"Relationship", ageQ:"How old are they?", genderQ:"Gender",
    yrs:"yrs",
    genderOpts:["Man","Woman","Neutral"],
    relOtherPlaceholder:"e.g. Best friend, Grandparents…",
    occQ:"What's the occasion?", occPlaceholder:"e.g. Birthday, Christmas, Valentine's Day…",
    otherLabel:"Other…", customPlaceholder:"e.g. Formula 1, yoga, wine, vintage cars…",
    pickAtLeast:"Pick at least one", selectedWord:"selected",
    budgetTitle:"Budget",
    detailsPlaceholder:"e.g. She just moved into her first apartment and loves hosting dinner parties. Already has plenty of candles…",
    promptChips:["They already have…","Loves a particular brand","Inside joke gift"],
    back:"Back", continue:"Continue →", findGifts:"Find my gifts ✨",
    loadingTitle:"Gifty is curating…",
    loadingLines:["Studying their profile…","Analysing interests & personality…","Matching to their tastes & budget…","Ranking the best finds…"],
    curatedTag:"CURATED FOR YOU",
    headline:(n,name,occ)=>`${n} gifts for ${name?name+"'s":"their"} ${occ}`,
    sub:(b,c)=>`Ranked by fit · ${b} budget · ${c}`,
    startOver:"Start over", sortLabel:"Sort", sortOpts:["Best match","Price: low","Price: high"],
    viewGift:"View gift →", refine:"Refine my answers", matchWord:"match",
    histTitle:"Your searches", histSub:"Every gift hunt you've run with Gifty. Pick one up where you left off.",
    viewResults:"View results", histEmptyTitle:"No searches yet", histEmptySub:"Run your first gift hunt and it'll show up here.", startSearch:"Start a search →",
    giftsWord:"gifts", budgetWord:"budget", whenNow:"just now", whenD2:"2 days ago", whenW1:"last week", whenW3:"3 weeks ago",
    histRow:(name,occ)=>`${name}'s ${occ}`,
    favTitle:"Saved gifts", favSub:"Everything you've hearted, in one place.",
    favEmptyTitle:"No favorites yet", favEmptySub:"Tap the heart on any gift to save it here.", findGiftsBtn:"Find gifts →",
    contactTitle:"Get in touch", contactSub:"Stuck on a gift, or something not working? Gifty's team usually replies within a day.",
    yourName:"Your name", email:"Email", help:"How can we help?", namePh:"Jane Doe", msgPh:"Tell us what's on your mind…",
    sendMsg:"Send message", sentTitle:"Message sent", sentSub:"Thanks for reaching out — we'll get back to you shortly.", sendAnother:"Send another", orEmail:"Or email us at",
    occ:{ birthday:"Birthday", christmas:"Christmas", valentine:"Valentine's", mothers:"Mother's Day", fathers:"Father's Day", graduation:"Graduation", wedding:"Wedding", anniversary:"Anniversary", housewarming:"Housewarming", baby:"Baby Shower", justbecause:"Just Because", other:"Other" },
    occFallback:"this occasion",
    rel:["Partner","Family","Friends","Colleagues","Other"],
    intr:["Cooking","Travel","Fitness","Reading","Gaming","Music","Art & Design","Tech","Fashion","Outdoors","Coffee","Wellness","Home","Photography"],
    deepDive: {
      0: {
        detailQ: "What kind of cooking do they love?", detailPlaceholder: "baking, Asian food, grilling/BBQ, wine, healthy cooking…",
        contextQ: "What do they enjoy most?", contextOpts: ["Everyday cooking","Hosting dinners","Home baking"],
        levelQ: "How into it are they?", levelOpts: ["Basic cooking","Enthusiast, tries new recipes","Almost chef-level"],
        brandQ: "Brand they love or gear they already have", brandPlaceholder: "KitchenAid, Global knives, already has a stand mixer…",
      },
      1: {
        detailQ: "What kind of traveller are they?", detailPlaceholder: "backpacking, luxury resorts, city breaks, camping/outdoors…",
        contextQ: "How do they usually travel?", contextOpts: ["Short weekend trips","Long/adventure trips","Relaxing holidays"],
        levelQ: "How often do they travel?", levelOpts: ["A few trips a year","Travels often","Constantly on the move"],
        brandQ: "Brand they love or gear they already have", brandPlaceholder: "Samsonite, Away, already has a trekking backpack…",
      },
      2: {
        detailQ: "What sport do they do?", detailPlaceholder: "running, gym/weights, yoga, cycling, swimming, crossfit…",
        contextQ: "Where do they train most?", contextOpts: ["Gym","Home","Outdoors"],
        levelQ: "How into it are they?", levelOpts: ["Just to stay fit","Really into it, trains often","Serious / competitive level"],
        brandQ: "Brand they love or gear they already have", brandPlaceholder: "Nike, Garmin, already has weights at home…",
      },
      3: {
        detailQ: "What genre do they read?", detailPlaceholder: "fiction, non-fiction, fantasy, thriller, poetry…",
        contextQ: "How do they read most?", contextOpts: ["Physical books","E-reader/Kindle","Audiobooks"],
        levelQ: "How much do they read?", levelOpts: ["A few books a year","Reads regularly","Devours a book a week"],
        brandQ: "A favourite author or series they love? (the best clue of all)", brandPlaceholder: "loves Murakami, obsessed with the Sanderson series…",
      },
      4: {
        detailQ: "What kind of games do they like?", detailPlaceholder: "action/adventure, strategy, sports, indie, retro…",
        contextQ: "What do they play on most?", contextOpts: ["PC","Console","Mobile"],
        levelQ: "What kind of gamer are they?", levelOpts: ["Plays to unwind","Really into it","Competitive/hardcore level"],
        brandQ: "A favourite game or series they love, and their console? (the best clue of all)", brandPlaceholder: "loves Zelda, plays on PS5, already has an elite controller…",
      },
      5: {
        detailQ: "What genre do they listen to most?", detailPlaceholder: "pop, rock, jazz, classical, electronic, hip-hop…",
        contextQ: "How do they experience music?", contextOpts: ["Just listening","Plays an instrument","Goes to concerts often"],
        levelQ: "How into it are they?", levelOpts: ["Listens for fun","True enthusiast/collector","Musician/DJ"],
        brandQ: "A favourite artist or band they love? (the best clue of all)", brandPlaceholder: "loves Radiohead, into vinyl, plays guitar…",
      },
      6: {
        detailQ: "What kind of art/design do they love?", detailPlaceholder: "painting, photography, interior design, illustration, contemporary art…",
        contextQ: "How do they engage with art?", contextOpts: ["Appreciates/observes","Creates it themselves","Collects pieces"],
        levelQ: "How involved are they?", levelOpts: ["Casual interest","True enthusiast","Professional/expert level"],
        brandQ: "Artist/brand they love or gear they already have", brandPlaceholder: "loves Rothko, already has acrylic paints…",
      },
      7: {
        detailQ: "What kind of tech excites them?", detailPlaceholder: "smart home, audio/headphones, digital photography, gaming, gadgets…",
        contextQ: "Which ecosystem do they use most?", contextOpts: ["Apple","Android/Windows","Mix of platforms"],
        levelQ: "How up to date are they?", levelOpts: ["Uses basic tech","Always up on new releases","Early adopter/expert"],
        brandQ: "Their main device/setup, or a brand they love? (the best clue of all)", brandPlaceholder: "has an iPhone 15 + MacBook, loves Sony, already has AirPods…",
      },
      8: {
        detailQ: "What style do they prefer?", detailPlaceholder: "streetwear, classic/elegant, minimalist, vintage, sporty…",
        contextQ: "What are they most into?", contextOpts: ["Clothing","Accessories","Shoes"],
        levelQ: "How much do they follow fashion?", levelOpts: ["Keeps it simple","Follows trends","True fashion insider"],
        brandQ: "Brand they love or their size", brandPlaceholder: "loves Massimo Dutti, size M, loves Nike…",
      },
      9: {
        detailQ: "What outdoor activity do they do?", detailPlaceholder: "hiking, camping, climbing, fishing, mountain biking…",
        contextQ: "Where do they go most?", contextOpts: ["Mountains","Sea/lake","Woods/trails near home"],
        levelQ: "How experienced are they?", levelOpts: ["Casual/occasional","Goes often","Expert/adventurous level"],
        brandQ: "Outdoor brand they love or gear they already have", brandPlaceholder: "loves Patagonia, already has hiking boots…",
      },
      10: {
        detailQ: "How do they take their coffee?", detailPlaceholder: "espresso, filter/pour-over, moka, capsules, specialty…",
        contextQ: "Where do they make it most?", contextOpts: ["Home","Office","On the go"],
        levelQ: "How into it are they?", levelOpts: ["Simple daily coffee","Cares about quality","True connoisseur/barista level"],
        brandQ: "Brand they love or gear they already have", brandPlaceholder: "loves Lavazza, already has a moka pot…",
      },
      11: {
        detailQ: "What helps them feel good?", detailPlaceholder: "yoga, meditation, skincare, massages, aromatherapy…",
        contextQ: "How do they practise it?", contextOpts: ["Home routine","Goes to spas/centres","Takes classes"],
        levelQ: "How big a part of their routine is it?", levelOpts: ["Now and then","Regular habit","Top priority in their life"],
        brandQ: "Brand they love or what they already use", brandPlaceholder: "loves Aesop, already has a yoga mat…",
      },
      12: {
        detailQ: "What do they care about most at home?", detailPlaceholder: "decor, kitchen, plants, decoration, organisation…",
        contextQ: "What's their home style?", contextOpts: ["Minimalist","Warm/cosy","Modern/design-led"],
        levelQ: "How much do they invest in it?", levelOpts: ["Keeps it practical","Cares a lot about details","True passion for interior design"],
        brandQ: "Brand they love or what they already have", brandPlaceholder: "loves Ikea, already has lots of plants…",
      },
      13: {
        detailQ: "What kind of photography do they do?", detailPlaceholder: "street, portraits, landscapes, film/analog, travel…",
        contextQ: "What do they shoot with most?", contextOpts: ["Smartphone","Mirrorless/DSLR","Film/analog"],
        levelQ: "Where are they in their journey?", levelOpts: ["Casual hobby","Really puts in effort","Semi-professional level"],
        brandQ: "Brand/model they love or gear they already have", brandPlaceholder: "loves Fujifilm, already has a 50mm lens…",
      },
    },
    buyOnAmazon:"Buy on Amazon",
    saveFav:"Save to favorites", savedFav:"Saved", savedSearch:"Saved this search",
    signInTitle:"Welcome to Gifty", signInSub:"Sign in to save your gift hunts, favorites and history across devices.",
    continueGoogle:"Continue with Google", continueEmail:"Continue with email", continueGuest:"Continue as guest",
    orWord:"or", termsNote:"By continuing you agree to our Terms & Privacy Policy.", waitMsg:"Please wait…",
    checkEmail:"Check your email", codeSent:"We sent a 6-digit code to", verifyCode:"Verify code", verifying:"Verifying…",
    disclaimerAmazon:"As an Amazon Associate, Gifty receives compensation from qualifying purchases.", disclaimerPrice:"Prices and availability subject to change.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Free · No Account · 2 Minutes",
    landingSub:"Answer a few quick questions and Gifty will find the perfect gift in seconds",
    howStep1Title:"Tell us who it's for", howStep1Desc:"Age, tastes, occasion and budget",
    howStep2Title:"Gifty analyses thousands of ideas", howStep2Desc:"AI matches tastes and budget",
    howStep3Title:"Pick and gift it", howStep3Desc:"6 ready picks, buyable on Amazon",
    card1Meta:"FOR ANNA · 28 · BIRTHDAY · LOVES COFFEE", card1Title:"Artisan coffee tasting box", card1Price:"€38",
    card2Meta:"FOR MARCO · 41 · ANNIVERSARY · LOVES MOTORBIKES", card2Title:"Vintage leather biker jacket", card2Price:"€220",
    chatBarPrompt:"✍️ Start writing below", chatBarLabel:"Who's the gift for? e.g. Girlfriend, friends…",
    stepCaption1:"Help us understand the recipient", stepCaption2:"Gifty analyses and picks from thousands of ideas", stepCaption3:"Choose and gift it via Amazon",
  },
  it: {
    nav:["Home","Preferiti"],
    h1a:"Il regalo perfetto,", h1b:"trovato per te.",
    intro:"Rispondi a qualche domanda veloce e Gifty — il tuo concierge personale — troverà il regalo perfetto per la tua occasione.",
    bFree:"Gratis · Nessun account · ~2 minuti", bBudget:"Ogni budget, ogni occasione", bSocial:"Personalizzato a fondo sui suoi gusti",
    proofPre:"Amato da", proofPost:"gifter premurosi",
    stepWord:"Passo", ofWord:"di",
    stepNames:["Il destinatario","Budget e occasione","Interessi","Entriamo nel dettaglio"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Per chi stai cercando un regalo?","Qual è il tuo budget, e per quale occasione?","Cosa gli/le piace?","Entriamo un po' più nel dettaglio — fa una grande differenza."],
    namePlaceholder:"Il suo nome…", nameHelp:"Il nome aiuta Gifty a capire il probabile genere e a personalizzare i suggerimenti.",
    relTitle:"Rapporto", ageQ:"Quanti anni ha?", genderQ:"Genere",
    yrs:"anni",
    genderOpts:["Uomo","Donna","Neutrale"],
    relOtherPlaceholder:"es. Migliore amico/a, Nonni…",
    occQ:"Qual è l'occasione?", occPlaceholder:"es. Compleanno, Natale, San Valentino…",
    otherLabel:"Altro…", customPlaceholder:"es. Formula 1, yoga, vino, auto d'epoca…",
    pickAtLeast:"Scegline almeno uno", selectedWord:"selezionati",
    budgetTitle:"Budget",
    detailsPlaceholder:"es. Si è appena trasferita nel suo primo appartamento e ama organizzare cene. Ha già tante candele…",
    promptChips:["Ha già…","Ama un marchio in particolare","Regalo scherzo"],
    back:"Indietro", continue:"Continua →", findGifts:"Trova i regali ✨",
    loadingTitle:"Gifty sta selezionando…",
    loadingLines:["Studio il profilo…","Analizzo interessi e personalità…","Abbino ai gusti e al budget…","Ordino i risultati migliori…"],
    curatedTag:"SELEZIONATI PER TE",
    headline:(n,name,occ)=>`${n} regali per ${occ}${name?" di "+name:""}`,
    sub:(b,c)=>`Ordinati per affinità · budget ${b} · ${c}`,
    startOver:"Ricomincia", sortLabel:"Ordina", sortOpts:["Affinità","Prezzo: basso","Prezzo: alto"],
    viewGift:"Vedi regalo →", refine:"Modifica le risposte", matchWord:"affinità",
    histTitle:"Le tue ricerche", histSub:"Tutte le ricerche fatte con Gifty. Riprendi da dove eri.",
    viewResults:"Vedi risultati", histEmptyTitle:"Ancora nessuna ricerca", histEmptySub:"Fai la tua prima ricerca e comparirà qui.", startSearch:"Inizia una ricerca →",
    giftsWord:"regali", budgetWord:"budget", whenNow:"adesso", whenD2:"2 giorni fa", whenW1:"la settimana scorsa", whenW3:"3 settimane fa",
    histRow:(name,occ)=>`${occ} di ${name}`,
    favTitle:"Regali salvati", favSub:"Tutto ciò che hai messo tra i preferiti, in un posto.",
    favEmptyTitle:"Ancora nessun preferito", favEmptySub:"Tocca il cuore su un regalo per salvarlo qui.", findGiftsBtn:"Trova regali →",
    contactTitle:"Contattaci", contactSub:"Bloccato su un regalo o qualcosa non funziona? Il team di Gifty risponde di solito entro un giorno.",
    yourName:"Il tuo nome", email:"Email", help:"Come possiamo aiutarti?", namePh:"Mario Rossi", msgPh:"Raccontaci pure…",
    sendMsg:"Invia messaggio", sentTitle:"Messaggio inviato", sentSub:"Grazie per averci scritto — ti risponderemo a breve.", sendAnother:"Invia un altro", orEmail:"Oppure scrivici a",
    occ:{ birthday:"Compleanno", christmas:"Natale", valentine:"San Valentino", mothers:"Festa della Mamma", fathers:"Festa del Papà", graduation:"Laurea", wedding:"Matrimonio", anniversary:"Anniversario", housewarming:"Inaugurazione casa", baby:"Nascita", justbecause:"Senza motivo", other:"Altro" },
    occFallback:"questa occasione",
    rel:["Fidanzato/a","Parenti","Amici","Colleghi","Altro"],
    intr:["Cucina","Viaggi","Fitness","Lettura","Gaming","Musica","Arte & Design","Tech","Moda","Outdoor","Caffè","Benessere","Casa","Fotografia"],
    deepDive: {
      0: {
        detailQ: "Che tipo di cucina ama?", detailPlaceholder: "pasticceria, cucina asiatica, grigliate/BBQ, vino, cucina salutare…",
        contextQ: "Cosa gli/le piace di più?", contextOpts: ["Cucina di tutti i giorni","Ama fare cene/intrattenere","Panetteria/pasticceria casalinga"],
        levelQ: "A che livello cucina?", levelOpts: ["Cucina base","Appassionato/a, prova ricette nuove","Livello quasi chef"],
        brandQ: "Marca che ama o attrezzatura che ha già", brandPlaceholder: "KitchenAid, coltelli Global, ha già una planetaria…",
      },
      1: {
        detailQ: "Che tipo di viaggiatore/viaggiatrice è?", detailPlaceholder: "zaino in spalla, resort di lusso, city break, campeggio/outdoor…",
        contextQ: "Come viaggia di solito?", contextOpts: ["Weekend brevi","Viaggi lunghi/avventura","Vacanze di relax"],
        levelQ: "Quanto viaggia?", levelOpts: ["Qualche viaggio l'anno","Viaggia spesso","Viaggiatore/viaggiatrice instancabile"],
        brandQ: "Brand di valigie/accessori che ama o cosa ha già", brandPlaceholder: "Samsonite, Away, ha già uno zaino da trekking…",
      },
      2: {
        detailQ: "Che sport pratica?", detailPlaceholder: "corsa, palestra/pesi, yoga, ciclismo, nuoto, crossfit…",
        contextQ: "Dove si allena di più?", contextOpts: ["Palestra","Casa","Outdoor"],
        levelQ: "Quanto è appassionato/a?", levelOpts: ["Lo fa per stare in forma","Ci mette passione, si allena spesso","Livello serio/competitivo"],
        brandQ: "Marca che ama o attrezzatura che ha già", brandPlaceholder: "Nike, Garmin, ha già i pesi in casa…",
      },
      3: {
        detailQ: "Che genere legge?", detailPlaceholder: "narrativa, saggistica, fantasy, thriller, poesia…",
        contextQ: "Come legge di più?", contextOpts: ["Libri cartacei","E-reader/Kindle","Audiolibri"],
        levelQ: "Quanto legge?", levelOpts: ["Qualche libro l'anno","Legge regolarmente","Divora un libro a settimana"],
        brandQ: "Un autore o una serie che ama? (l'indizio più prezioso)", brandPlaceholder: "ama Murakami, fissata con la serie di Sanderson…",
      },
      4: {
        detailQ: "Che tipo di giochi preferisce?", detailPlaceholder: "action/avventura, strategia, sportivi, indie, retro…",
        contextQ: "Su cosa gioca di più?", contextOpts: ["PC","Console","Mobile"],
        levelQ: "Che tipo di giocatore/giocatrice è?", levelOpts: ["Gioca per rilassarsi","Giocatore/giocatrice appassionato/a","Livello competitivo/hardcore"],
        brandQ: "Un gioco o una serie che ama, e la sua console? (l'indizio più prezioso)", brandPlaceholder: "ama Zelda, gioca su PS5, ha già un controller elite…",
      },
      5: {
        detailQ: "Che genere ascolta di più?", detailPlaceholder: "pop, rock, jazz, classica, elettronica, hip-hop…",
        contextQ: "Come vive la musica?", contextOpts: ["Solo ascolto","Suona uno strumento","Va a concerti spesso"],
        levelQ: "Quanto è appassionato/a?", levelOpts: ["Ascolta per svago","Vero/a appassionato/a o collezionista","Musicista/DJ"],
        brandQ: "Un artista o una band che ama? (l'indizio più prezioso)", brandPlaceholder: "ama i Radiohead, colleziona vinili, suona la chitarra…",
      },
      6: {
        detailQ: "Che tipo di arte/design ama?", detailPlaceholder: "pittura, fotografia, design d'interni, illustrazione, arte contemporanea…",
        contextQ: "Come vive l'arte?", contextOpts: ["Osservatore/appassionato","Pratica lui/lei stesso","Colleziona pezzi"],
        levelQ: "Quanto è coinvolto/a?", levelOpts: ["Interesse occasionale","Vero/a appassionato/a","Livello professionale/esperto"],
        brandQ: "Artista o brand che ama, o cosa ha già", brandPlaceholder: "ama Rothko, ha già dei colori acrilici…",
      },
      7: {
        detailQ: "Che tipo di tech lo/la appassiona?", detailPlaceholder: "smart home, audio/cuffie, fotografia digitale, gaming, gadget…",
        contextQ: "Ecosistema che usa di più?", contextOpts: ["Apple","Android/Windows","Multi-piattaforma"],
        levelQ: "Quanto è aggiornato/a?", levelOpts: ["Usa la tecnologia base","Sempre aggiornato/a sulle novità","Early adopter/esperto"],
        brandQ: "Il dispositivo che usa di più, o un brand che ama? (l'indizio più prezioso)", brandPlaceholder: "ha iPhone 15 e MacBook, ama Sony, ha già le AirPods…",
      },
      8: {
        detailQ: "Che stile preferisce?", detailPlaceholder: "streetwear, classico/elegante, minimalista, vintage, sportivo…",
        contextQ: "Cosa cerca di più?", contextOpts: ["Abbigliamento","Accessori","Scarpe"],
        levelQ: "Quanto segue la moda?", levelOpts: ["Stile essenziale","Attento/a alle tendenze","Vera passione/fashion insider"],
        brandQ: "Brand che ama o taglia", brandPlaceholder: "ama Massimo Dutti, taglia M, ama le Nike…",
      },
      9: {
        detailQ: "Che attività outdoor pratica?", detailPlaceholder: "hiking, campeggio, arrampicata, pesca, mountain bike…",
        contextQ: "Dove va di più?", contextOpts: ["Montagna","Mare/lago","Boschi/sentieri vicino casa"],
        levelQ: "Quanto è esperto/a?", levelOpts: ["Amatoriale/occasionale","Ci va spesso","Livello esperto/avventuroso"],
        brandQ: "Brand outdoor che ama o attrezzatura che ha già", brandPlaceholder: "ama Patagonia, ha già scarponi da trekking…",
      },
      10: {
        detailQ: "Come beve il caffè?", detailPlaceholder: "espresso, filtro/pour-over, moka, capsule, specialty…",
        contextQ: "Dove lo prepara di più?", contextOpts: ["Casa","Ufficio","In viaggio"],
        levelQ: "Quanto è appassionato/a?", levelOpts: ["Caffè quotidiano semplice","Ci tiene alla qualità","Vero/a intenditore/intenditrice o da barista"],
        brandQ: "Marca che ama o attrezzatura che ha già", brandPlaceholder: "ama Lavazza, ha già una moka…",
      },
      11: {
        detailQ: "Cosa lo/la fa stare bene?", detailPlaceholder: "yoga, meditazione, skincare, massaggi, aromaterapia…",
        contextQ: "Come lo pratica?", contextOpts: ["Routine a casa","Va in centri/spa","Segue corsi/lezioni"],
        levelQ: "Quanto è nella sua routine?", levelOpts: ["Ogni tanto","Abitudine regolare","Priorità assoluta nella sua vita"],
        brandQ: "Brand che ama o cosa usa già", brandPlaceholder: "ama Aesop, ha già un tappetino yoga…",
      },
      12: {
        detailQ: "Cosa cura di più in casa?", detailPlaceholder: "arredamento, cucina, piante, decorazione, organizzazione…",
        contextQ: "Che stile ha la sua casa?", contextOpts: ["Minimalista","Calda/accogliente","Design/moderna"],
        levelQ: "Quanto ci investe?", levelOpts: ["Praticità base","Cura molto i dettagli","Vera passione per l'interior design"],
        brandQ: "Brand che ama o cosa ha già", brandPlaceholder: "ama Ikea, ha già molte piante…",
      },
      13: {
        detailQ: "Che tipo di fotografia pratica?", detailPlaceholder: "street, ritratti, paesaggi, pellicola/analogica, viaggi…",
        contextQ: "Con cosa scatta di più?", contextOpts: ["Smartphone","Mirrorless/reflex","Pellicola/analogico"],
        levelQ: "Quanto è nel suo percorso?", levelOpts: ["Hobby occasionale","Ci mette impegno","Livello semi-professionale"],
        brandQ: "Brand/modello che ama o attrezzatura che ha già", brandPlaceholder: "ama Fujifilm, ha già un obiettivo 50mm…",
      },
    },
    buyOnAmazon:"Acquista su Amazon",
    saveFav:"Salva tra i preferiti", savedFav:"Salvato", savedSearch:"Salvati in questa ricerca",
    signInTitle:"Benvenuto su Gifty", signInSub:"Accedi per salvare le tue ricerche, i preferiti e la cronologia su tutti i dispositivi.",
    continueGoogle:"Continua con Google", continueEmail:"Continua con email", continueGuest:"Continua come ospite",
    orWord:"oppure", termsNote:"Continuando accetti i nostri Termini e la Privacy Policy.", waitMsg:"Attendere…",
    checkEmail:"Controlla la tua email", codeSent:"Abbiamo inviato un codice a 6 cifre a", verifyCode:"Verifica codice", verifying:"Verifica in corso…",
    disclaimerAmazon:"In qualità di Affiliato Amazon, Gifty riceve compensi dagli acquisti idonei.", disclaimerPrice:"Prezzi e disponibilità soggetti a modifica.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Gratis · No Account · 2 Minuti",
    landingSub:"Rispondi a qualche domanda e Gifty troverà il regalo perfetto in pochi secondi",
    howStep1Title:"Racconta a chi lo regali", howStep1Desc:"Età, gusti, occasione e budget",
    howStep2Title:"Gifty analizza migliaia di idee", howStep2Desc:"L'AI incrocia gusti e budget",
    howStep3Title:"Scegli e regala", howStep3Desc:"6 proposte pronte, acquistabili su Amazon",
    card1Meta:"PER ANNA · 28 ANNI · COMPLEANNO · APPASSIONATA DI CAFFÈ", card1Title:"Box degustazione caffè artigianale", card1Price:"€38",
    card2Meta:"PER MARCO · 41 ANNI · ANNIVERSARIO · APPASSIONATO DI MOTO", card2Title:"Giacca da moto in pelle vintage", card2Price:"€220",
    chatBarPrompt:"✍️ Inizia scrivendo qui sotto", chatBarLabel:"Per chi è il regalo? Es. Fidanzata/o, amici…",
    stepCaption1:"Aiutaci a comprendere il destinatario", stepCaption2:"Gifty analizza e seleziona tra migliaia di idee", stepCaption3:"Scegli e regala tramite Amazon",
  },
  fr: {
    nav:["Accueil","Favoris"],
    h1a:"Le cadeau parfait,", h1b:"trouvé pour vous.",
    intro:"Répondez à quelques questions rapides et Gifty — votre concierge personnel — trouvera le cadeau parfait pour vous.",
    bFree:"Gratuit · Sans compte · ~2 minutes", bBudget:"Tous les budgets, toutes les occasions", bSocial:"Personnalisé selon ses goûts",
    proofPre:"Adoré par", proofPost:"offreurs attentionnés",
    stepWord:"Étape", ofWord:"sur",
    stepNames:["Le destinataire","Budget et occasion","Centres d'intérêt","Entrons dans le détail"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Pour qui cherchons-nous un cadeau ?","Quel est votre budget, et pour quelle occasion ?","Qu'est-ce qui lui plaît ?","Entrons un peu plus dans le détail — ça fait une grande différence."],
    namePlaceholder:"Son prénom…", nameHelp:"Le prénom aide Gifty à deviner le genre probable et à personnaliser les suggestions.",
    relTitle:"Relation", ageQ:"Quel âge a-t-il ?", genderQ:"Genre",
    yrs:"ans",
    genderOpts:["Homme","Femme","Neutre"],
    relOtherPlaceholder:"ex. Meilleur(e) ami(e), Grands-parents…",
    occQ:"Quelle est l'occasion ?", occPlaceholder:"ex. Anniversaire, Noël, Saint-Valentin…",
    otherLabel:"Autre…", customPlaceholder:"ex. Formule 1, yoga, vin, voitures vintage…",
    pickAtLeast:"Choisissez-en au moins un", selectedWord:"sélectionné(s)",
    budgetTitle:"Budget",
    detailsPlaceholder:"ex. Elle vient d'emménager dans son premier appartement et adore recevoir. Elle a déjà plein de bougies…",
    promptChips:["Il a déjà…","Aime une marque en particulier","Cadeau private joke"],
    back:"Retour", continue:"Continuer →", findGifts:"Trouver mes cadeaux ✨",
    loadingTitle:"Gifty fait sa sélection…",
    loadingLines:["Étude du profil…","Analyse des goûts et de la personnalité…","Mise en correspondance avec les goûts et le budget…","Classement des meilleures trouvailles…"],
    curatedTag:"SÉLECTIONNÉS POUR VOUS",
    headline:(n,name,occ)=>`${n} cadeaux pour ${occ}${name?" de "+name:""}`,
    sub:(b,c)=>`Classés par pertinence · budget ${b} · ${c}`,
    startOver:"Recommencer", sortLabel:"Trier", sortOpts:["Pertinence","Prix : bas","Prix : élevé"],
    viewGift:"Voir le cadeau →", refine:"Modifier mes réponses", matchWord:"corresp.",
    histTitle:"Vos recherches", histSub:"Toutes vos recherches avec Gifty. Reprenez où vous en étiez.",
    viewResults:"Voir les résultats", histEmptyTitle:"Aucune recherche", histEmptySub:"Lancez votre première recherche et elle apparaîtra ici.", startSearch:"Lancer une recherche →",
    giftsWord:"cadeaux", budgetWord:"budget", whenNow:"à l'instant", whenD2:"il y a 2 jours", whenW1:"la semaine dernière", whenW3:"il y a 3 semaines",
    histRow:(name,occ)=>`${occ} de ${name}`,
    favTitle:"Cadeaux enregistrés", favSub:"Tout ce que vous avez aimé, au même endroit.",
    favEmptyTitle:"Aucun favori", favEmptySub:"Touchez le cœur d'un cadeau pour l'enregistrer ici.", findGiftsBtn:"Trouver des cadeaux →",
    contactTitle:"Contactez-nous", contactSub:"Bloqué sur un cadeau ou un souci ? L'équipe Gifty répond généralement sous un jour.",
    yourName:"Votre nom", email:"E-mail", help:"Comment pouvons-nous aider ?", namePh:"Jean Dupont", msgPh:"Dites-nous tout…",
    sendMsg:"Envoyer", sentTitle:"Message envoyé", sentSub:"Merci de nous avoir contactés — nous reviendrons vers vous rapidement.", sendAnother:"En envoyer un autre", orEmail:"Ou écrivez-nous à",
    occ:{ birthday:"Anniversaire", christmas:"Noël", valentine:"Saint-Valentin", mothers:"Fête des Mères", fathers:"Fête des Pères", graduation:"Diplôme", wedding:"Mariage", anniversary:"Anniversaire de couple", housewarming:"Pendaison de crémaillère", baby:"Naissance", justbecause:"Sans raison", other:"Autre" },
    occFallback:"cette occasion",
    rel:["Partenaire","Famille","Amis","Collègues","Autre"],
    intr:["Cuisine","Voyage","Fitness","Lecture","Jeux vidéo","Musique","Art & Design","Tech","Mode","Plein air","Café","Bien-être","Maison","Photographie"],
    deepDive: { 2: {
      detailQ: "Quel sport pratique-t-il/elle ?", detailPlaceholder: "course à pied, salle/musculation, yoga, vélo, natation, crossfit…",
      contextQ: "Où s'entraîne-t-il/elle le plus ?", contextOpts: ["Salle","Maison","Extérieur"],
      levelQ: "À quel point est-il/elle passionné(e) ?", levelOpts: ["Pour rester en forme","Très motivé(e), s'entraîne souvent","Niveau sérieux/compétitif"],
      brandQ: "Marque qu'il/elle aime ou équipement qu'il/elle a déjà", brandPlaceholder: "Nike, Garmin, a déjà des poids à la maison…",
    } },
    buyOnAmazon:"Acheter sur Amazon",
    saveFav:"Enregistrer dans les favoris", savedFav:"Enregistré", savedSearch:"Enregistrés dans cette recherche",
    signInTitle:"Bienvenue sur Gifty", signInSub:"Connectez-vous pour sauvegarder vos recherches, favoris et historique.",
    continueGoogle:"Continuer avec Google", continueEmail:"Continuer avec l'email", continueGuest:"Continuer en tant qu'invité",
    orWord:"ou", termsNote:"En continuant, vous acceptez nos Conditions et notre Politique de confidentialité.", waitMsg:"Veuillez patienter…",
    checkEmail:"Vérifiez votre email", codeSent:"Nous avons envoyé un code à 6 chiffres à", verifyCode:"Vérifier le code", verifying:"Vérification…",
    disclaimerAmazon:"En tant que partenaire Amazon, Gifty reçoit des commissions sur les achats éligibles.", disclaimerPrice:"Prix et disponibilité sujets à modification.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Gratuit · Sans compte · 2 Minutes",
    landingSub:"Répondez à quelques questions rapides et Gifty trouvera le cadeau parfait en quelques secondes",
    howStep1Title:"Dites-nous pour qui c'est", howStep1Desc:"Âge, goûts, occasion et budget",
    howStep2Title:"Gifty analyse des milliers d'idées", howStep2Desc:"L'IA associe goûts et budget",
    howStep3Title:"Choisissez et offrez", howStep3Desc:"6 idées prêtes, achetables sur Amazon",
    card1Meta:"POUR ANNA · 28 ANS · ANNIVERSAIRE · AIME LE CAFÉ", card1Title:"Coffret dégustation café artisanal", card1Price:"38€",
    card2Meta:"POUR MARCO · 41 ANS · ANNIVERSAIRE DE MARIAGE · AIME LA MOTO", card2Title:"Blouson moto en cuir vintage", card2Price:"220€",
    chatBarPrompt:"✍️ Commencez à écrire ci-dessous", chatBarLabel:"Pour qui est le cadeau ? Ex. Copine/copain, amis…",
    stepCaption1:"Aidez-nous à comprendre le destinataire", stepCaption2:"Gifty analyse et sélectionne parmi des milliers d'idées", stepCaption3:"Choisissez et offrez via Amazon",
  },
  de: {
    nav:["Start","Favoriten"],
    h1a:"Das perfekte Geschenk,", h1b:"für dich gefunden.",
    intro:"Beantworte ein paar kurze Fragen und Gifty — dein persönlicher Concierge — findet das perfekte Geschenk für dich.",
    bFree:"Kostenlos · Kein Konto · ~2 Minuten", bBudget:"Jedes Budget, jeder Anlass", bSocial:"Tief auf ihren Geschmack zugeschnitten",
    proofPre:"Geliebt von", proofPost:"aufmerksamen Schenkern",
    stepWord:"Schritt", ofWord:"von",
    stepNames:["Die Person","Budget & Anlass","Interessen","Ins Detail gehen"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Für wen suchen wir ein Geschenk?","Was ist dein Budget, und für welchen Anlass?","Worauf steht die Person?","Lass uns etwas genauer werden — das macht einen großen Unterschied."],
    namePlaceholder:"Ihr Vorname…", nameHelp:"Der Name hilft Gifty, das wahrscheinliche Geschlecht zu erkennen und Vorschläge anzupassen.",
    relTitle:"Beziehung", ageQ:"Wie alt ist die Person?", genderQ:"Geschlecht",
    yrs:"J.",
    genderOpts:["Mann","Frau","Neutral"],
    relOtherPlaceholder:"z.B. Beste/r Freund/in, Großeltern…",
    occQ:"Was ist der Anlass?", occPlaceholder:"z.B. Geburtstag, Weihnachten, Valentinstag…",
    otherLabel:"Anderes…", customPlaceholder:"z.B. Formel 1, Yoga, Wein, Oldtimer…",
    pickAtLeast:"Wähle mindestens eins", selectedWord:"ausgewählt",
    budgetTitle:"Budget",
    detailsPlaceholder:"z.B. Sie ist gerade in ihre erste Wohnung gezogen und liebt es, Dinnerpartys zu geben. Hat schon viele Kerzen…",
    promptChips:["Hat schon…","Liebt eine bestimmte Marke","Insider-Geschenk"],
    back:"Zurück", continue:"Weiter →", findGifts:"Geschenke finden ✨",
    loadingTitle:"Gifty kuratiert…",
    loadingLines:["Profil wird studiert…","Interessen & Persönlichkeit werden analysiert…","Abgleich mit Geschmack & Budget…","Beste Funde werden sortiert…"],
    curatedTag:"FÜR DICH KURATIERT",
    headline:(n,name,occ)=>`${n} Geschenke für ${name?name+"s":"den"} ${occ}`,
    sub:(b,c)=>`Nach Passung sortiert · Budget ${b} · ${c}`,
    startOver:"Neu starten", sortLabel:"Sortieren", sortOpts:["Beste Übereinst.","Preis: niedrig","Preis: hoch"],
    viewGift:"Geschenk ansehen →", refine:"Antworten anpassen", matchWord:"Match",
    histTitle:"Deine Suchen", histSub:"Alle deine Suchen mit Gifty. Mach dort weiter, wo du aufgehört hast.",
    viewResults:"Ergebnisse ansehen", histEmptyTitle:"Noch keine Suchen", histEmptySub:"Starte deine erste Suche und sie erscheint hier.", startSearch:"Suche starten →",
    giftsWord:"Geschenke", budgetWord:"Budget", whenNow:"gerade eben", whenD2:"vor 2 Tagen", whenW1:"letzte Woche", whenW3:"vor 3 Wochen",
    histRow:(name,occ)=>`${name}s ${occ}`,
    favTitle:"Gespeicherte Geschenke", favSub:"Alles, was du favorisiert hast, an einem Ort.",
    favEmptyTitle:"Noch keine Favoriten", favEmptySub:"Tippe auf das Herz eines Geschenks, um es hier zu speichern.", findGiftsBtn:"Geschenke finden →",
    contactTitle:"Kontakt", contactSub:"Stehst du bei einem Geschenk fest oder klemmt etwas? Das Gifty-Team antwortet meist innerhalb eines Tages.",
    yourName:"Dein Name", email:"E-Mail", help:"Wie können wir helfen?", namePh:"Max Mustermann", msgPh:"Erzähl uns…",
    sendMsg:"Nachricht senden", sentTitle:"Nachricht gesendet", sentSub:"Danke für deine Nachricht — wir melden uns bald.", sendAnother:"Weitere senden", orEmail:"Oder schreib uns an",
    occ:{ birthday:"Geburtstag", christmas:"Weihnachten", valentine:"Valentinstag", mothers:"Muttertag", fathers:"Vatertag", graduation:"Abschluss", wedding:"Hochzeit", anniversary:"Jahrestag", housewarming:"Einzug", baby:"Babyparty", justbecause:"Einfach so", other:"Andere" },
    occFallback:"diesen Anlass",
    rel:["Partner/in","Familie","Freunde","Kollegen","Andere"],
    intr:["Kochen","Reisen","Fitness","Lesen","Gaming","Musik","Kunst & Design","Tech","Mode","Outdoor","Kaffee","Wellness","Zuhause","Fotografie"],
    deepDive: { 2: {
      detailQ: "Welchen Sport macht er/sie?", detailPlaceholder: "Laufen, Fitnessstudio/Gewichte, Yoga, Radfahren, Schwimmen, Crossfit…",
      contextQ: "Wo trainiert er/sie meistens?", contextOpts: ["Fitnessstudio","Zuhause","Draußen"],
      levelQ: "Wie sehr steht er/sie darauf?", levelOpts: ["Nur um fit zu bleiben","Wirklich begeistert, trainiert oft","Ernsthaftes/wettkampforientiertes Niveau"],
      brandQ: "Marke, die er/sie liebt, oder Ausrüstung, die schon vorhanden ist", brandPlaceholder: "Nike, Garmin, hat schon Gewichte zuhause…",
    } },
    buyOnAmazon:"Bei Amazon kaufen",
    saveFav:"Zu Favoriten hinzufügen", savedFav:"Gespeichert", savedSearch:"In dieser Suche gespeichert",
    signInTitle:"Willkommen bei Gifty", signInSub:"Melde dich an, um deine Suchanfragen, Favoriten und den Verlauf zu speichern.",
    continueGoogle:"Mit Google fortfahren", continueEmail:"Mit E-Mail fortfahren", continueGuest:"Als Gast fortfahren",
    orWord:"oder", termsNote:"Mit dem Fortfahren stimmst du unseren Nutzungsbedingungen und der Datenschutzrichtlinie zu.", waitMsg:"Bitte warten…",
    checkEmail:"Prüfe deine E-Mail", codeSent:"Wir haben einen 6-stelligen Code gesendet an", verifyCode:"Code bestätigen", verifying:"Wird überprüft…",
    disclaimerAmazon:"Als Amazon-Partner erhält Gifty Provisionen von qualifizierten Käufen.", disclaimerPrice:"Preise und Verfügbarkeit können sich ändern.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Kostenlos · Kein Konto · 2 Minuten",
    landingSub:"Beantworte ein paar kurze Fragen und Gifty findet in Sekunden das perfekte Geschenk",
    howStep1Title:"Erzähl uns, für wen es ist", howStep1Desc:"Alter, Geschmack, Anlass und Budget",
    howStep2Title:"Gifty analysiert Tausende Ideen", howStep2Desc:"Die KI kombiniert Geschmack und Budget",
    howStep3Title:"Auswählen und verschenken", howStep3Desc:"6 fertige Vorschläge, kaufbar auf Amazon",
    card1Meta:"FÜR ANNA · 28 · GEBURTSTAG · LIEBT KAFFEE", card1Title:"Kaffee-Verkostungsbox", card1Price:"38€",
    card2Meta:"FÜR MARCO · 41 · JAHRESTAG · LIEBT MOTORRÄDER", card2Title:"Vintage-Lederjacke für Motorradfahrer", card2Price:"220€",
    chatBarPrompt:"✍️ Schreib unten los", chatBarLabel:"Für wen ist das Geschenk? z. B. Freundin/Freund, Freunde…",
    stepCaption1:"Hilf uns, die beschenkte Person zu verstehen", stepCaption2:"Gifty analysiert und wählt aus Tausenden Ideen aus", stepCaption3:"Auswählen und über Amazon verschenken",
  },
  es: {
    nav:["Inicio","Favoritos"],
    h1a:"El regalo perfecto,", h1b:"encontrado para ti.",
    intro:"Responde unas preguntas rápidas y Gifty — tu concierge personal — encontrará el regalo perfecto para ti.",
    bFree:"Gratis · Sin cuenta · ~2 minutos", bBudget:"Cada presupuesto, cada ocasión", bSocial:"Personalizado a fondo según sus gustos",
    proofPre:"Amado por", proofPost:"regaladores atentos",
    stepWord:"Paso", ofWord:"de",
    stepNames:["El destinatario","Presupuesto y ocasión","Intereses","Vamos al detalle"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["¿Para quién buscamos un regalo?","¿Cuál es tu presupuesto, y para qué ocasión?","¿Qué le gusta?","Vamos a entrar un poco más en detalle — marca una gran diferencia."],
    namePlaceholder:"Su nombre…", nameHelp:"El nombre ayuda a Gifty a deducir el género probable y personalizar las sugerencias.",
    relTitle:"Relación", ageQ:"¿Qué edad tiene?", genderQ:"Género",
    yrs:"años",
    genderOpts:["Hombre","Mujer","Neutral"],
    relOtherPlaceholder:"ej. Mejor amigo/a, Abuelos…",
    occQ:"¿Cuál es la ocasión?", occPlaceholder:"ej. Cumpleaños, Navidad, San Valentín…",
    otherLabel:"Otro…", customPlaceholder:"ej. Fórmula 1, yoga, vino, coches clásicos…",
    pickAtLeast:"Elige al menos uno", selectedWord:"seleccionados",
    budgetTitle:"Presupuesto",
    detailsPlaceholder:"ej. Acaba de mudarse a su primer apartamento y le encanta organizar cenas. Ya tiene muchas velas…",
    promptChips:["Ya tiene…","Le encanta una marca","Regalo de broma interna"],
    back:"Atrás", continue:"Continuar →", findGifts:"Buscar regalos ✨",
    loadingTitle:"Gifty está seleccionando…",
    loadingLines:["Estudiando el perfil…","Analizando intereses y personalidad…","Comparando con gustos y presupuesto…","Ordenando los mejores hallazgos…"],
    curatedTag:"SELECCIONADOS PARA TI",
    headline:(n,name,occ)=>`${n} regalos para ${occ}${name?" de "+name:""}`,
    sub:(b,c)=>`Ordenados por afinidad · presupuesto ${b} · ${c}`,
    startOver:"Empezar de nuevo", sortLabel:"Ordenar", sortOpts:["Mejor afinidad","Precio: bajo","Precio: alto"],
    viewGift:"Ver regalo →", refine:"Ajustar mis respuestas", matchWord:"afinidad",
    histTitle:"Tus búsquedas", histSub:"Todas tus búsquedas con Gifty. Retoma donde lo dejaste.",
    viewResults:"Ver resultados", histEmptyTitle:"Aún no hay búsquedas", histEmptySub:"Haz tu primera búsqueda y aparecerá aquí.", startSearch:"Iniciar búsqueda →",
    giftsWord:"regalos", budgetWord:"presupuesto", whenNow:"ahora mismo", whenD2:"hace 2 días", whenW1:"la semana pasada", whenW3:"hace 3 semanas",
    histRow:(name,occ)=>`${occ} de ${name}`,
    favTitle:"Regalos guardados", favSub:"Todo lo que marcaste, en un solo lugar.",
    favEmptyTitle:"Aún no hay favoritos", favEmptySub:"Toca el corazón de un regalo para guardarlo aquí.", findGiftsBtn:"Buscar regalos →",
    contactTitle:"Contáctanos", contactSub:"¿Atascado con un regalo o algo no funciona? El equipo de Gifty suele responder en un día.",
    yourName:"Tu nombre", email:"Email", help:"¿Cómo podemos ayudar?", namePh:"Juan Pérez", msgPh:"Cuéntanos…",
    sendMsg:"Enviar mensaje", sentTitle:"Mensaje enviado", sentSub:"Gracias por escribirnos — te responderemos pronto.", sendAnother:"Enviar otro", orEmail:"O escríbenos a",
    occ:{ birthday:"Cumpleaños", christmas:"Navidad", valentine:"San Valentín", mothers:"Día de la Madre", fathers:"Día del Padre", graduation:"Graduación", wedding:"Boda", anniversary:"Aniversario", housewarming:"Inauguración", baby:"Baby shower", justbecause:"Porque sí", other:"Otro" },
    occFallback:"esta ocasión",
    rel:["Pareja","Familia","Amigos","Colegas","Otro"],
    intr:["Cocina","Viajes","Fitness","Lectura","Videojuegos","Música","Arte y Diseño","Tech","Moda","Aire libre","Café","Bienestar","Hogar","Fotografía"],
    deepDive: { 2: {
      detailQ: "¿Qué deporte practica?", detailPlaceholder: "correr, gimnasio/pesas, yoga, ciclismo, natación, crossfit…",
      contextQ: "¿Dónde entrena más?", contextOpts: ["Gimnasio","Casa","Aire libre"],
      levelQ: "¿Cuánto le apasiona?", levelOpts: ["Solo para mantenerse en forma","Muy motivado/a, entrena a menudo","Nivel serio/competitivo"],
      brandQ: "Marca que le encanta o equipo que ya tiene", brandPlaceholder: "Nike, Garmin, ya tiene pesas en casa…",
    } },
    buyOnAmazon:"Comprar en Amazon",
    saveFav:"Guardar en favoritos", savedFav:"Guardado", savedSearch:"Guardados en esta búsqueda",
    signInTitle:"Bienvenido a Gifty", signInSub:"Inicia sesión para guardar tus búsquedas, favoritos e historial.",
    continueGoogle:"Continuar con Google", continueEmail:"Continuar con email", continueGuest:"Continuar como invitado",
    orWord:"o", termsNote:"Al continuar, aceptas nuestros Términos y Política de privacidad.", waitMsg:"Por favor espera…",
    checkEmail:"Revisa tu email", codeSent:"Enviamos un código de 6 dígitos a", verifyCode:"Verificar código", verifying:"Verificando…",
    disclaimerAmazon:"Como afiliado de Amazon, Gifty recibe compensaciones por compras elegibles.", disclaimerPrice:"Precios y disponibilidad sujetos a cambios.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Gratis · Sin Cuenta · 2 Minutos",
    landingSub:"Responde algunas preguntas rápidas y Gifty encontrará el regalo perfecto en segundos",
    howStep1Title:"Cuéntanos para quién es", howStep1Desc:"Edad, gustos, ocasión y presupuesto",
    howStep2Title:"Gifty analiza miles de ideas", howStep2Desc:"La IA combina gustos y presupuesto",
    howStep3Title:"Elige y regala", howStep3Desc:"6 propuestas listas, disponibles en Amazon",
    card1Meta:"PARA ANA · 28 · CUMPLEAÑOS · AMA EL CAFÉ", card1Title:"Caja de cata de café artesanal", card1Price:"38€",
    card2Meta:"PARA MARCO · 41 · ANIVERSARIO · AMA LAS MOTOS", card2Title:"Chaqueta de moto de cuero vintage", card2Price:"220€",
    chatBarPrompt:"✍️ Empieza a escribir aquí abajo", chatBarLabel:"¿Para quién es el regalo? Ej. Novia/o, amigos…",
    stepCaption1:"Ayúdanos a entender al destinatario", stepCaption2:"Gifty analiza y elige entre miles de ideas", stepCaption3:"Elige y regala a través de Amazon",
  },
  pt: {
    nav:["Início","Favoritos"],
    h1a:"O presente perfeito,", h1b:"encontrado para você.",
    intro:"Responda a algumas perguntas rápidas e Gifty — o seu concierge pessoal — encontrará o presente perfeito para você.",
    bFree:"Grátis · Sem conta · ~2 minutos", bBudget:"Cada orçamento, cada ocasião", bSocial:"Personalizado ao detalhe para os seus gostos",
    proofPre:"Amado por", proofPost:"presenteadores atentos",
    stepWord:"Passo", ofWord:"de",
    stepNames:["O destinatário","Orçamento e ocasião","Interesses","Vamos ao detalhe"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Para quem procuramos um presente?","Qual é o seu orçamento, e para que ocasião?","Do que gosta?","Vamos entrar um pouco mais no detalhe — faz uma grande diferença."],
    namePlaceholder:"O seu nome…", nameHelp:"O nome ajuda o Gifty a identificar o género provável e a personalizar as sugestões.",
    relTitle:"Relação", ageQ:"Que idade tem?", genderQ:"Género",
    yrs:"anos",
    genderOpts:["Homem","Mulher","Neutro"],
    relOtherPlaceholder:"ex. Melhor amigo/a, Avós…",
    occQ:"Qual é a ocasião?", occPlaceholder:"ex. Aniversário, Natal, Dia dos Namorados…",
    otherLabel:"Outro…", customPlaceholder:"ex. Fórmula 1, yoga, vinho, carros vintage…",
    pickAtLeast:"Escolha pelo menos um", selectedWord:"selecionados",
    budgetTitle:"Orçamento",
    detailsPlaceholder:"ex. Acabou de mudar para o seu primeiro apartamento e adora receber convidados. Já tem muitas velas…",
    promptChips:["Já tem…","Adora uma marca específica","Presente de piada interna"],
    back:"Voltar", continue:"Continuar →", findGifts:"Encontrar presentes ✨",
    loadingTitle:"Gifty está a selecionar…",
    loadingLines:["A estudar o perfil…","A analisar interesses e personalidade…","A comparar com gostos e orçamento…","A ordenar as melhores descobertas…"],
    curatedTag:"SELECIONADOS PARA SI",
    headline:(n,name,occ)=>`${n} presentes para ${occ}${name?" de "+name:""}`,
    sub:(b,c)=>`Ordenados por afinidade · orçamento ${b} · ${c}`,
    startOver:"Recomeçar", sortLabel:"Ordenar", sortOpts:["Melhor afinidade","Preço: baixo","Preço: alto"],
    viewGift:"Ver presente →", refine:"Ajustar respostas", matchWord:"afinidade",
    histTitle:"As suas pesquisas", histSub:"Todas as suas pesquisas com o Gifty. Retome onde parou.",
    viewResults:"Ver resultados", histEmptyTitle:"Ainda sem pesquisas", histEmptySub:"Faça a sua primeira pesquisa e ela aparecerá aqui.", startSearch:"Iniciar pesquisa →",
    giftsWord:"presentes", budgetWord:"orçamento", whenNow:"agora mesmo", whenD2:"há 2 dias", whenW1:"semana passada", whenW3:"há 3 semanas",
    histRow:(name,occ)=>`${occ} de ${name}`,
    favTitle:"Presentes guardados", favSub:"Tudo o que marcou com coração, num só lugar.",
    favEmptyTitle:"Ainda sem favoritos", favEmptySub:"Toque no coração de um presente para o guardar aqui.", findGiftsBtn:"Encontrar presentes →",
    contactTitle:"Contacte-nos", contactSub:"Preso num presente ou algo não funciona? A equipa Gifty responde normalmente num dia.",
    yourName:"O seu nome", email:"Email", help:"Como podemos ajudar?", namePh:"João Silva", msgPh:"Conte-nos o que se passa…",
    sendMsg:"Enviar mensagem", sentTitle:"Mensagem enviada", sentSub:"Obrigado por entrar em contacto — respondemos em breve.", sendAnother:"Enviar outra", orEmail:"Ou escreva-nos para",
    occ:{ birthday:"Aniversário", christmas:"Natal", valentine:"Dia dos Namorados", mothers:"Dia da Mãe", fathers:"Dia do Pai", graduation:"Formatura", wedding:"Casamento", anniversary:"Aniversário de casal", housewarming:"Inauguração de casa", baby:"Chá de bebé", justbecause:"Sem motivo", other:"Outro" },
    occFallback:"esta ocasião",
    rel:["Parceiro/a","Família","Amigos","Colegas","Outro"],
    intr:["Culinária","Viagens","Fitness","Leitura","Gaming","Música","Arte & Design","Tech","Moda","Ao ar livre","Café","Bem-estar","Casa","Fotografia"],
    deepDive: { 2: {
      detailQ: "Que desporto pratica?", detailPlaceholder: "corrida, ginásio/pesos, yoga, ciclismo, natação, crossfit…",
      contextQ: "Onde treina mais?", contextOpts: ["Ginásio","Casa","Ao ar livre"],
      levelQ: "O quão apaixonado/a é?", levelOpts: ["Só para se manter em forma","Muito motivado/a, treina muitas vezes","Nível sério/competitivo"],
      brandQ: "Marca que adora ou equipamento que já tem", brandPlaceholder: "Nike, Garmin, já tem pesos em casa…",
    } },
    buyOnAmazon:"Comprar na Amazon",
    saveFav:"Guardar nos favoritos", savedFav:"Guardado", savedSearch:"Guardados nesta pesquisa",
    signInTitle:"Bem-vindo ao Gifty", signInSub:"Inicia sessão para guardar as tuas pesquisas, favoritos e histórico.",
    continueGoogle:"Continuar com Google", continueEmail:"Continuar com email", continueGuest:"Continuar como convidado",
    orWord:"ou", termsNote:"Ao continuar, aceitas os nossos Termos e Política de Privacidade.", waitMsg:"Por favor aguarda…",
    checkEmail:"Verifica o teu email", codeSent:"Enviámos um código de 6 dígitos para", verifyCode:"Verificar código", verifying:"A verificar…",
    disclaimerAmazon:"Como Afiliado Amazon, Gifty recebe compensações de compras elegíveis.", disclaimerPrice:"Preços e disponibilidade sujeitos a alteração.",
    landingKicker:"AI-Powered Gifting", landingBadge:"Grátis · Sem Conta · 2 Minutos",
    landingSub:"Responda algumas perguntas rápidas e a Gifty encontrará o presente perfeito em segundos",
    howStep1Title:"Conte-nos para quem é", howStep1Desc:"Idade, gostos, ocasião e orçamento",
    howStep2Title:"A Gifty analisa milhares de ideias", howStep2Desc:"A IA combina gostos e orçamento",
    howStep3Title:"Escolha e presenteie", howStep3Desc:"6 sugestões prontas, disponíveis na Amazon",
    card1Meta:"PARA ANA · 28 · ANIVERSÁRIO · AMA CAFÉ", card1Title:"Caixa de degustação de café artesanal", card1Price:"€38",
    card2Meta:"PARA MARCO · 41 · ANIVERSÁRIO DE CASAMENTO · AMA MOTOS", card2Title:"Jaqueta de moto em couro vintage", card2Price:"€220",
    chatBarPrompt:"✍️ Comece a escrever abaixo", chatBarLabel:"Para quem é o presente? Ex. Namorada/o, amigos…",
    stepCaption1:"Ajude-nos a entender quem vai receber", stepCaption2:"A Gifty analisa e escolhe entre milhares de ideias", stepCaption3:"Escolha e presenteie através da Amazon",
  },
};

/* ─── Static data ────────────────────────────────────────────── */
const OCC_IDS = ["birthday","christmas","valentine","mothers","fathers","graduation","wedding","anniversary","housewarming","baby","justbecause","other"];
const OCC_EMOJI: Record<string,string> = { birthday:"🎂", christmas:"🎄", valentine:"💝", mothers:"🌸", fathers:"👔", graduation:"🎓", wedding:"💍", anniversary:"💑", housewarming:"🏡", baby:"👶", justbecause:"✨", other:"🎁" };

const INTEREST_EXAMPLES: Record<string, string> = {
  Cooking: "obsessed with Japanese food, home chef with a KitchenAid, loves hosting dinner parties",
  Cucina: "ossessionato dalla cucina giapponese, chef casalingo con KitchenAid, ama organizzare cene",
  Travel: "backpacker type, luxury hotels only, obsessed with Japan or Italy",
  Viaggi: "tipo zaino in spalla, solo hotel di lusso, ossessionato da Giappone o Italia",
  Fitness: "CrossFit fanatic, training for a triathlon, powerlifter",
  Reading: "reads 50+ books a year, only fiction, loves Stoicism",
  Lettura: "legge 50+ libri ogni anno, solo narrativa, ama lo stoicismo",
  Gaming: "PC gaming high-end rig, PlayStation competitive, Nintendo fan",
  Music: "goes to every festival, vinyl collector, plays guitar",
  Musica: "va a ogni festival, colleziona vinili, suona la chitarra",
  "Art & Design": "paints watercolours, collects contemporary art, graphic designer",
  "Arte & Design": "dipinge acquerelli, colleziona arte contemporanea, graphic designer",
  Tech: "Apple ecosystem first to upgrade, smart home Sonos Hue, audiophile",
  Fashion: "into Loro Piana and Brunello Cucinelli, streetwear Supreme Palace, classic minimal",
  Moda: "Loro Piana e Brunello Cucinelli, streetwear Supreme Palace, minimal classico",
  Outdoors: "multi-day treks, wild camping minimal kit, rock climber",
  Coffee: "specialty coffee has a La Marzocco at home, obsessed with matcha",
  "Caffe": "specialty coffee ha una La Marzocco a casa, ossessionato col matcha",
  Wellness: "hot yoga every morning, into Ayurveda and breathwork",
  Home: "just moved in furnishing from scratch, Scandinavian design obsessed, plant person",
  Casa: "appena trasferita arredamento da zero, ossessionata dal design scandinavo, plant person",
  Photography: "shoots on film, street photography black and white, Sony A7 mirrorless",
  Fotografia: "scatta su pellicola, street photography in bianco e nero, Sony A7 mirrorless",
};

/* ─── Types ──────────────────────────────────────────────────── */
interface HistoryEntry {
  id: string;
  emoji: string;
  name: string;
  occId: string;
  count: number;
  budgetVal: number;
  when: string;
  gifts: GiftSuggestion[];
}

interface Gathered {
  recipientName: string;
  occasion: string | null;
  relationship: string;
  showOtherRel: boolean;
  gender: string;
  age: number;
  interests: string[];
  customInterest: string;
  showOther: boolean;
  budget: number;
  details: string;
  interestDeepDive: Partial<Record<number, InterestDeepDiveAnswer>>;
}

const EMPTY: Gathered = {
  recipientName:"", occasion:null, relationship:"", showOtherRel:false, gender:"", age:30,
  interests:[], customInterest:"", showOther:false, budget:75, details:"", interestDeepDive:{},
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtAge(a: number) { return a <= 2 ? `${a} yr` : a >= 90 ? "90+" : `${a}`; }
function fmtBudget(b: number, sym: string) { return b >= 500 ? `${sym}500+` : `${sym}${b}`; }
function budgetToSliderStep(budget: number) {
  return budget <= 100 ? Math.round(budget / 5) : 20 + Math.round((budget - 100) / 25);
}

interface FavoriteSearchGroup {
  id: string;
  name: string;
  occasion: string;
  budget: number;
  currencySymbol: string;
  gifts: GiftSuggestion[];
  gathered: Gathered;
  clueText: string;
  signals: ProfileSignal[];
  conversation: ChatMessage[];
  languageIndex: number;
  savedAt: number;
}

type Screen = "landing" | "intake" | "clues" | "signals" | "loading" | "results" | "refine" | "favorites" | "favorite-detail";
const MOBILE_LOADING_LINES = [
  "Collego gli indizi più importanti",
  "Confronto idee davvero acquistabili",
  "Scelgo le proposte più adatte",
];
const SPEECH_LOCALES: Record<TKey, string> = {
  en:"en-US", fr:"fr-FR", it:"it-IT", de:"de-DE", es:"es-ES", pt:"pt-PT",
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionController = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionController;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
function sliderStepToBudget(step: number) {
  return step <= 20 ? step * 5 : 100 + (step - 20) * 25;
}
function normalizeRecipientName(value: string, locale = "it") {
  return value
    .toLocaleLowerCase(locale)
    .replace(/(^|[\s'-])\p{L}/gu, letter => letter.toLocaleUpperCase(locale));
}
function parsePriceLow(r: string): number { const m = r.replace(/[, ]/g,"").match(/\d+/); return m ? parseInt(m[0]) : 9999; }
// Pre-API: the model's price is an estimate, and the link goes to an Amazon
// search page — so we never show it as an exact price. Widen it into an
// indicative band ("~€14–18") to avoid implying a guaranteed Amazon price.
function toPriceBand(priceRange: string, sym: string): string {
  const nums = (priceRange.match(/\d+/g) || []).map(Number);
  if (nums.length === 0) return priceRange;
  const lo = Math.max(1, Math.round(Math.min(...nums) * 0.85));
  const hi = Math.round(Math.max(...nums) * 1.15);
  return lo === hi ? `~${sym}${lo}` : `~${sym}${lo}–${hi}`;
}
function detectLangIdx(): number {
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("it")) return 2;
  if (lang.startsWith("fr")) return 3;
  if (lang.startsWith("de")) return 4;
  if (lang.startsWith("es")) return 5;
  if (lang.startsWith("pt")) return 6;
  if (lang.startsWith("en-gb") || lang === "en-uk") return 1;
  return 0;
}

function buildLocaleFromIP(raw: { country_code?: string; country_name?: string; currency?: string }, currentIdx: number): number {
  const cc = (raw.country_code ?? "US").toUpperCase();
  const cur = (raw.currency ?? "USD").toUpperCase();
  if (cc === "GB") return 1;
  if (cur === "EUR") {
    const lang = (navigator.language ?? "").toLowerCase();
    if (lang.startsWith("it")) return 2;
    if (lang.startsWith("fr")) return 3;
    if (lang.startsWith("de")) return 4;
    if (lang.startsWith("es")) return 5;
    if (lang.startsWith("pt")) return 6;
  }
  return currentIdx;
}

function buildFirstMessage(g: Gathered, sym: string, tr: Tr): string {
  const budgetMax = g.budget >= 500 ? 2000 : Math.round(g.budget * 1.15);
  const budgetMin = Math.max(10, Math.round(g.budget * 0.70));
  const occLabel = g.occasion ? (tr.occ[g.occasion] ?? g.occasion) : "gift";
  const allInterests = [...g.interests, ...(g.customInterest.trim() ? [g.customInterest.trim()] : [])];
  const autoHints = g.interests
    .map(i => { const ex = INTEREST_EXAMPLES[i]; return ex ? `• ${i}: ${ex}` : null; })
    .filter(Boolean).join("\n");
  const deepDiveLines = g.interests
    .map(label => {
      const idx = tr.intr.indexOf(label);
      const ans = idx !== -1 ? g.interestDeepDive[idx] : undefined;
      if (!ans) return null;
      const parts = [ans.detail, ans.context, ans.level, ans.brand].map(s => s.trim()).filter(Boolean);
      return parts.length ? `• ${label} → ${parts.join(" | ")}` : null;
    })
    .filter(Boolean).join("\n");
  return [
    `I need a ${occLabel} gift for my ${g.relationship.toLowerCase()}${g.recipientName ? ` (${g.recipientName})` : ""}.`,
    `Age: ${fmtAge(g.age)} years old.`,
    allInterests.length ? `Interests: ${allInterests.join(", ")}.` : "",
    autoHints ? `Interest context:\n${autoHints}` : "",
    deepDiveLines ? `Specific detail per interest (use this to narrow the product category tightly — this is the strongest signal you have):\n${deepDiveLines}` : "",
    g.details ? `Extra details: ${g.details}` : "",
    `Budget: ${sym}${budgetMin}–${sym}${budgetMax}. Stay within range.`,
    g.recipientName ? `The recipient's name is ${g.recipientName} — use the name to infer their likely gender and tailor suggestions accordingly.` : "",
    "Propose 4–6 specific, real, named products (brand + model + variant). Each must feel tailored to this exact person.",
  ].filter(Boolean).join("\n");
}

/* ─── InterestsStep ──────────────────────────────────────────── */
const MAX_INTERESTS = 3;

function InterestsStep({ g, setG, tr }: { g: Gathered; setG: React.Dispatch<React.SetStateAction<Gathered>>; tr: Tr }) {
  const count = g.interests.length + (g.customInterest.trim() ? 1 : 0);
  const atMax = count >= MAX_INTERESTS;

  function toggleInterest(i: string) {
    setG(p => {
      if (p.interests.includes(i)) return { ...p, interests: p.interests.filter(x => x !== i) };
      const customCount = p.customInterest.trim() ? 1 : 0;
      if (p.interests.length + customCount >= MAX_INTERESTS) return p;
      return { ...p, interests: [...p.interests, i] };
    });
  }
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:9 }}>
        {tr.intr.map(i => {
          const selected = g.interests.includes(i);
          const disabled = !selected && atMax;
          return (
            <button key={i} onClick={() => toggleInterest(i)} disabled={disabled}
              style={{ ...chipSt(selected), opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
              {i}
            </button>
          );
        })}
        <button
          disabled={!g.showOther && atMax}
          onClick={() => { setG(p => ({ ...p, showOther: !p.showOther, customInterest: p.showOther ? "" : p.customInterest })); }}
          style={{ ...chipSt(g.showOther || g.customInterest.trim().length > 0), opacity: (!g.showOther && atMax) ? 0.4 : 1, cursor: (!g.showOther && atMax) ? "not-allowed" : "pointer" }}>
          {tr.otherLabel}
        </button>
      </div>
      {g.showOther && (
        <div style={{ marginTop:14 }}>
          <input
            autoFocus
            type="text" autoComplete="off" autoCorrect="off" name="gc-custom-interest"
            value={g.customInterest}
            onChange={e => setG(p => ({ ...p, customInterest: e.target.value }))}
            placeholder={tr.customPlaceholder}
            style={{ width:"100%", padding:"12px 15px", border:`1.5px solid ${C.maroon}`, borderRadius:12, fontFamily:BODY, fontSize:15, color:C.body, background:"#fff", boxSizing:"border-box" as const }}
          />
        </div>
      )}
      <div style={{ marginTop:14, fontSize:13, color:C.muted2 }}>
        {count > 0 ? `${count}/${MAX_INTERESTS} ${tr.selectedWord}` : tr.pickAtLeast}
      </div>
    </div>
  );
}

function InterestDeepDiveStep({ g, setG, tr }: { g: Gathered; setG: React.Dispatch<React.SetStateAction<Gathered>>; tr: Tr }) {
  const blocks = g.interests
    .map(label => ({ label, idx: tr.intr.indexOf(label) }))
    .filter(({ idx }) => idx !== -1 && tr.deepDive[idx] != null);

  const [activeIdx, setActiveIdx] = useState(blocks[0]?.idx ?? -1);
  const active = blocks.find(b => b.idx === activeIdx) ?? blocks[0];

  function updateAnswer(idx: number, patch: Partial<InterestDeepDiveAnswer>) {
    setG(p => ({
      ...p,
      interestDeepDive: {
        ...p.interestDeepDive,
        [idx]: { detail:"", context:"", level:"", brand:"", ...p.interestDeepDive[idx], ...patch },
      },
    }));
  }

  const inputSt: React.CSSProperties = { width:"100%", padding:"11px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:BODY, fontSize:14, color:C.body, background:"#fff", boxSizing:"border-box" as const };

  if (!active) return null;
  const cfg = tr.deepDive[active.idx]!;
  const ans = g.interestDeepDive[active.idx] ?? { detail:"", context:"", level:"", brand:"" };

  return (
    <div>
      {/* Tabs — one per selected interest that has a deep-dive config */}
      {blocks.length > 1 && (
        <div style={{ display:"flex", gap:8, marginBottom:18 }}>
          {blocks.map(({ label, idx }) => (
            <button key={idx} onClick={() => setActiveIdx(idx)}
              style={{
                padding:"9px 16px", borderRadius:999, cursor:"pointer", fontSize:13.5, fontWeight:600,
                border: idx === active.idx ? "none" : `1.5px solid ${C.bord3}`,
                background: idx === active.idx ? C.maroon : "#fff",
                color: idx === active.idx ? "#fff" : C.label2,
                transition:"all .15s",
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding:"18px 20px", border:`1.5px solid ${C.bord4}`, borderRadius:16, background:"#fdfbf8" }}>
        {blocks.length === 1 && (
          <div style={{ fontSize:13, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" as const, color:C.maroon, marginBottom:14 }}>{active.label}</div>
        )}

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.label, marginBottom:7 }}>{cfg.detailQ}</div>
          <input type="text" value={ans.detail} onChange={e => updateAnswer(active.idx, { detail: e.target.value })} placeholder={cfg.detailPlaceholder} style={inputSt} />
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.label, marginBottom:7 }}>{cfg.contextQ}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {cfg.contextOpts.map(o => (
              <button key={o} onClick={() => updateAnswer(active.idx, { context: ans.context === o ? "" : o })} style={chipSt(ans.context === o)}>{o}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.label, marginBottom:7 }}>{cfg.levelQ}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {cfg.levelOpts.map(o => (
              <button key={o} onClick={() => updateAnswer(active.idx, { level: ans.level === o ? "" : o })} style={chipSt(ans.level === o)}>{o}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:13.5, fontWeight:600, color:C.label, marginBottom:7 }}>{cfg.brandQ}</div>
          <input type="text" value={ans.brand} onChange={e => updateAnswer(active.idx, { brand: e.target.value })} placeholder={cfg.brandPlaceholder} style={inputSt} />
        </div>
      </div>
    </div>
  );
}

/* Three numbered stops on a rail, the
   current one filled, the others clickable to jump straight there. Shows
   at a glance that the journey is three steps and where you are in it. */
const PHASE_STOPS = [
  { n:1, selector:".gc-v3-phase-one",   label:"Racconta" },
  { n:2, selector:".gc-v3-phase-two",   label:"Analisi" },
  { n:3, selector:".gc-v3-phase-three", label:"Risultati" },
];

function StepRail({ active, onGo }:{ active:number; onGo:(selector:string)=>void }) {
  return (
    <div className="gc-v3-rail" role="group" aria-label={`Passaggio ${active} di 3`}>
      {PHASE_STOPS.map(stop => (
        <button
          key={stop.n}
          type="button"
          className="gc-v3-rail-stop"
          data-state={stop.n === active ? "current" : stop.n < active ? "done" : "next"}
          aria-current={stop.n === active ? "step" : undefined}
          onClick={() => onGo(stop.selector)}
        >
          <i>{stop.n === active ? <b/> : null}</i>
          <span>{stop.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [screen,      setScreen]      = useState<Screen>("landing");
  const [mobileFlow,  setMobileFlow]  = useState(false);
  const [landingBarFocused, setLandingBarFocused] = useState(false);
  const [landingSheetOpen, setLandingSheetOpen] = useState(false);
  const [landingDisclaimerOpen, setLandingDisclaimerOpen] = useState(false);
  const [landingProgress, setLandingProgress] = useState(0);
  const [landingActivePhase, setLandingActivePhase] = useState(0);
  const [typedCount, setTypedCount] = useState(0);
  const [analysedCount, setAnalysedCount] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  // Set when the mobile landing bar's free-text answer is used to fill
  // g.relationship directly — step 0 then skips its own relationship
  // picker since it's already answered.
  const [skipRelPicker, setSkipRelPicker] = useState(false);
  const gcMainRef = useRef<HTMLElement>(null);
  const heroTrackRef = useRef<HTMLDivElement>(null);
  const activePhaseRef = useRef(0);
  const [step,        setStep]        = useState(0);
  const [stepKey,     setStepKey]     = useState(0);
  const [g,           setG]           = useState<Gathered>(EMPTY);
  const [gifts,       setGifts]       = useState<GiftSuggestion[]>([]);
  const [sortBy,      setSortBy]      = useState<"match"|"price"|"priceHigh">("price");
  const [loadingLine, setLoadingLine] = useState(0);
  const [langIdx,     setLangIdx]     = useState(2); // default: Italian (testing phase — Amazon affiliate is IT-only)
  const [langMenuOpen,setLangMenuOpen]= useState(false);
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [viewedEntry, setViewedEntry] = useState<HistoryEntry | null>(null);
  const [convo,       setConvo]       = useState<ChatMessage[]>([]);
  const [thumbs,      setThumbs]      = useState<Record<string, "up"|"down">>({});
  const [refining,    setRefining]    = useState(false);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [clueText,    setClueText]    = useState("");
  const [clueChat,    setClueChat]    = useState<ChatMessage[]>([]);
  const [adaptiveQuestion, setAdaptiveQuestion] = useState<AdaptiveQuestionResult | null>(null);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [signals,     setSignals]     = useState<ProfileSignal[]>([]);
  const [signalsBusy, setSignalsBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [editingSignals, setEditingSignals] = useState(false);
  const [resultIndex, setResultIndex] = useState(0);
  const [favoriteGifts, setFavoriteGifts] = useState<GiftSuggestion[]>([]);
  const [favoriteSearches, setFavoriteSearches] = useState<FavoriteSearchGroup[]>([]);
  const [activeSearchId, setActiveSearchId] = useState("");
  const [expandedFavoriteSearch, setExpandedFavoriteSearch] = useState<string | null>(null);
  const [selectedFavorite, setSelectedFavorite] = useState<{ groupId:string; giftId:string } | null>(null);
  const [favoritesReturnScreen, setFavoritesReturnScreen] = useState<Screen>("results");
  const [refineBaseGift, setRefineBaseGift] = useState<GiftSuggestion | null>(null);
  const [refineText, setRefineText] = useState("");
  const [refineChoices, setRefineChoices] = useState<string[]>([]);
  const [refinementRound, setRefinementRound] = useState(0);
  /* Contact form */
  const [cName,       setCName]       = useState("");
  const [cEmail,      setCEmail]      = useState("");
  const [cMsg,        setCMsg]        = useState("");
  const [contactSent, setContactSent] = useState(false);

  const HIST_KEY = "gifty-history";
  const FAVORITES_KEY = "gifty-favorite-searches";

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionController | null>(null);
  const speechBaseTextRef = useRef("");
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lang = LANGS[langIdx];
  const tr   = TR[lang.t as TKey] ?? TR.en;
  const sym  = lang.sym;
  const landingForm = LANDING_FORM_COPY[lang.t as TKey] ?? LANDING_FORM_COPY.en;
  const totalFavoriteCount = favoriteSearches.reduce((total, search) => total + search.gifts.length, 0);
  const selectedFavoriteGroup = selectedFavorite ? favoriteSearches.find(search => search.id === selectedFavorite.groupId) : undefined;
  const selectedFavoriteGift = selectedFavoriteGroup?.gifts.find(gift => gift.id === selectedFavorite?.giftId);
  const landingStep = landingProgress < .25 ? 0 : landingProgress < .50 ? 1 : 2;
  // The per-phase scroll fractions that used to drive the reveal inline are
  // gone: each phase now animates once, on arrival, from its data-active
  // attribute. Driving the same elements from both scroll position and a
  // CSS animation is what made every entrance look like a false start.

  useEffect(() => setHasMounted(true), []);

  /* ── Mobile landing: show the mobile-only intro screen on first mount.
     Done in an effect (not the useState initializer) so the very first
     render always matches the server ("intake"), avoiding a hydration
     mismatch — window.innerWidth isn't available during SSR. ── */
  useEffect(() => {
    if (screen !== "landing") return;
    const scroller = gcMainRef.current;
    if (!scroller) return;
    const stops = [".gc-v3-hero", ".gc-v3-phase-one", ".gc-v3-phase-two", ".gc-v3-phase-three", ".gc-v3-start"]
      .map(selector => scroller.querySelector<HTMLElement>(selector))
      .filter((element): element is HTMLElement => Boolean(element));

    /* A phase becomes the active one as soon as its top edge rises past 60%
       of the viewport — roughly 40% into the movement, while it is still
       coming in. This used to wait for scrolling to stop and then a further
       110ms; because a snap scroll keeps firing scroll events for its whole
       400-800ms, the phase had been sitting still on screen for about a
       second before its entrance began. */
    const pickActivePhase = () => {
      const trigger = scroller.getBoundingClientRect().top + scroller.clientHeight * 0.82;
      let active = 0;
      stops.forEach((element, index) => {
        if (element.getBoundingClientRect().top <= trigger) active = index;
      });
      // Mirrored into a ref so the hero carousel's frame loop can check it
      // without the effect having to re-register on every phase change.
      activePhaseRef.current = active;
      setLandingActivePhase(active);
    };

    const updateLandingProgress = () => {
      const distance = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
      setLandingProgress(Math.min(1, Math.max(0, scroller.scrollTop / distance)));
      // Measured straight off the scroll event, not deferred to the next
      // animation frame: the browser already throttles scroll to about one
      // event per frame, and anything frame-based stalls when the tab isn't
      // compositing — which would leave the phases stuck un-animated.
      pickActivePhase();
    };
    updateLandingProgress();
    scroller.addEventListener("scroll", updateLandingProgress, { passive:true });
    return () => scroller.removeEventListener("scroll", updateLandingProgress);
  }, [screen]);

  /* ── Hero carousel: a real 3D coverflow, same construction as the
     Bending Spoons hero (a `perspective` wrapper with each card placed on
     an arc, not a flat CSS marquee). Positions are written straight to the
     DOM on every frame — putting the offset in React state would re-render
     the whole page 60×/second. Each card sits at a signed slot distance `a`
     from centre and gets, from that: an x offset, a z push-back, and a
     rotateY so it angles back toward the middle of the screen. ── */
  useEffect(() => {
    if (screen !== "landing") return;
    const track = heroTrackRef.current;
    if (!track) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const n = cards.length;
    if (!n) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Slots the arc actually curves over; past this the z stops receding so
    // far cards keep travelling outward in a straight line and leave the
    // screen, instead of being squashed back toward the centre by the
    // perspective divide.
    const ARC_SLOTS = 3.4;
    const TILT = 7;           // side cards turn inward, like a shallow gallery wall
    const DEPTH = 28;         // depth gained by each slot away from the recessed centre
    const SECONDS_PER_CARD = 3.6;

    let offset = 0;
    let last = performance.now();
    let raf = 0;

    const layout = () => {
      const step = cards[0].offsetWidth * 1.12; // a real gap: cards never cover one another
      for (let i = 0; i < n; i++) {
        // Signed distance from the centre slot, wrapped into -n/2 … +n/2 so
        // cards recycle round the back of the loop while off-screen.
        let a = (((i - offset) % n) + n) % n;
        if (a > n / 2) a -= n;
        const dist = Math.abs(a);
        const curved = Math.min(dist, ARC_SLOTS);
        const z = -120 + Math.pow(curved, 1.12) * DEPTH;
        const rot = -Math.sign(a) * curved * TILT;
        const opacity = Math.max(0, Math.min(1, 1 - (dist - 2.6) / 1.1));
        const el = cards[i];
        el.style.transform = `translate3d(${a * step}px,0,${z}px) rotateY(${rot}deg)`;
        el.style.zIndex = String(100 - Math.round(dist * 10));
        el.style.opacity = String(opacity);
        // Cards that have looped round the back are fully transparent but
        // would still be composited every frame — take them out entirely.
        el.style.visibility = opacity === 0 ? "hidden" : "visible";
      }
    };

    // Place the arc synchronously on mount. Without this the cards sit in a
    // single stack until the first animation frame — and a backgrounded or
    // non-compositing tab never gets one, so the hero would render as one
    // card-shaped pile.
    layout();

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      // Idle while the hero is off screen. Fourteen cards were being
      // repositioned every frame for the whole journey, competing with the
      // phase entrances for the same frames.
      if (activePhaseRef.current === 0) {
        if (!reduced) offset += dt / (SECONDS_PER_CARD * 1000);
        layout();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [screen]);

  /* ── Each stop hands over to the next on its own: the opening screen after
     HERO_DWELL_MS, every phase after PHASE_DWELL_MS. Scrolling yourself
     re-targets the phase and restarts the timer, so it never fights you. ── */
  useEffect(() => {
    if (screen !== "landing") return;
    if (landingActivePhase > 3) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = [".gc-v3-phase-one", ".gc-v3-phase-two", ".gc-v3-phase-three", ".gc-v3-start"][landingActivePhase];
    const dwell = landingActivePhase === 0 ? HERO_DWELL_MS : PHASE_DWELL_MS[landingActivePhase - 1];
    const id = window.setTimeout(() => scrollLandingTo(next), dwell);
    return () => window.clearTimeout(id);
  }, [screen, landingActivePhase]);

  /* ── Phase 2's counter. Runs the tally up while the columns build, so the
     panel reads as work happening rather than a static result. ── */
  useEffect(() => {
    if (screen !== "landing") return;
    if (landingActivePhase !== 2) { setAnalysedCount(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnalysedCount(ANALYSED_TARGET);
      return;
    }
    const started = performance.now();
    const id = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / ANALYSED_MS);
      // Ease out, so it sprints then settles onto the final number.
      setAnalysedCount(Math.round(ANALYSED_TARGET * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) window.clearInterval(id);
    }, 40);
    return () => window.clearInterval(id);
  }, [screen, landingActivePhase]);

  /* ── The cards have to leave from inside the parcel, so the distance from
     where they come to rest up to the box is measured rather than guessed —
     it changes with viewport height, and a fixed offset had them starting
     level with the search bar instead. ── */
  useEffect(() => {
    if (screen !== "landing") return;
    const measure = () => {
      const pops = document.querySelector<HTMLElement>(".gc-v3-pops");
      const box = document.querySelector<HTMLElement>(".gc-v3-parcel-box");
      if (!pops || !box) return;
      const card = pops.querySelector<HTMLElement>(".gc-v3-pop");
      if (!card) return;
      const from = box.getBoundingClientRect();
      const origin = pops.getBoundingClientRect();
      // The cards hang by their bottom edge off a zero-height origin, so half
      // a card has to come back to put their centre inside the box.
      const half = card.offsetHeight / 2;
      pops.style.setProperty("--pop-from-y", `${Math.round(from.top + from.height / 2 - origin.top + half)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [screen]);

  /* ── Phase 1: type the example message out, character by character.
     Rewinds whenever you leave the phase so it replays on the way back. ── */
  useEffect(() => {
    if (landingActivePhase !== 1) { setTypedCount(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedCount(PHASE_ONE_SENTENCE.length);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setTypedCount(n);
      if (n >= PHASE_ONE_SENTENCE.length) window.clearInterval(id);
    }, PHASE_ONE_TYPE_MS);
    return () => window.clearInterval(id);
  }, [landingActivePhase]);

  /* iOS Safari keeps the focused field and its zoom across React screens.
     Release focus and restore the flow to the top whenever the step changes. */
  useEffect(() => {
    if (!mobileFlow) return;
    if (screen !== "clues" && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      speechRecognitionRef.current = null;
      setIsListening(false);
    }
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement?.matches("input, textarea, select")) activeElement.blur();
    requestAnimationFrame(() => {
      gcMainRef.current?.scrollTo({ top:0, behavior:"auto" });
      window.scrollTo({ top:0, behavior:"auto" });
    });
  }, [mobileFlow, screen]);

  useEffect(() => () => speechRecognitionRef.current?.abort(), []);

  /* ── iubenda: load once so Privacy/Cookie Policy links open as a popup ── */
  useEffect(() => {
    if (window.location.hostname === "localhost") return;
    if (document.getElementById("iubenda-loader")) return;
    const s = document.createElement("script");
    s.id = "iubenda-loader";
    s.src = "https://cdn.iubenda.com/iubenda.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  /* ── Locale detection ──
     Testing phase: default is always Italian (index 2) regardless of browser
     language or IP — Amazon affiliate program is IT-only right now. The
     language dropdown still works and manual choices are still remembered.
     Auto-detect (detectLangIdx / buildLocaleFromIP) is left in place below,
     unused for now, ready to re-enable once we expand beyond Italy. */
  useEffect(() => {
    const saved = localStorage.getItem("gifty-lang-idx");
    if (saved !== null) {
      setLangIdx(Number(saved));
      return;
    }
    setLangIdx(2);
  }, []);

  /* ── Persist language choice ── */
  useEffect(() => {
    localStorage.setItem("gifty-lang-idx", String(langIdx));
  }, [langIdx]);

  /* ── Load from localStorage ── */
  useEffect(() => {
    try {
      const hist = localStorage.getItem(HIST_KEY);
      setHistory(hist ? JSON.parse(hist) : []);
      const savedFavorites = localStorage.getItem(FAVORITES_KEY);
      setFavoriteSearches(savedFavorites ? JSON.parse(savedFavorites) : []);
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading status lines ── */
  const LOADING_LINES = tr.loadingLines;
  useEffect(() => {
    if (screen === "loading") {
      const loadingLineCount = mobileFlow ? MOBILE_LOADING_LINES.length : LOADING_LINES.length;
      intervalRef.current = setInterval(() => setLoadingLine(l => (l + 1) % loadingLineCount), mobileFlow ? 1700 : 650);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [screen, mobileFlow]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Close lang menu on outside click ── */
  useEffect(() => {
    function h(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) setLangMenuOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Navigation ── */
  function canContinue() {
    if (step === 0) return g.relationship.trim().length > 0 && g.gender.trim().length > 0 && g.age > 0;
    if (step === 1) return !!g.occasion && g.occasion.trim().length > 0;
    if (step === 2) return g.interests.length > 0 || g.customInterest.trim().length > 0;
    return true;
  }
  function hasInterestDeepDive() {
    return g.interests.some(label => {
      const idx = tr.intr.indexOf(label);
      return idx !== -1 && tr.deepDive[idx] != null;
    });
  }
  function advance() {
    // Step 3 (interest deep-dive) is the last step; if none of the chosen
    // interests have a deep-dive config, step 2 is effectively the last one.
    if (step === 2 && !hasInterestDeepDive()) { fireRequest(); return; }
    if (step < 3) { setStep(s => s + 1); setStepKey(k => k + 1); } else fireRequest();
  }
  function goBack() {
    setStep(s => Math.max(0, s - 1)); setStepKey(k => k + 1);
  }
  function restart() {
    const next: Screen = "landing";
    speechRecognitionRef.current?.abort(); setIsListening(false); setVoiceError(""); setG(EMPTY); setStep(0); setStepKey(0); setGifts([]); setSortBy("price"); setScreen(next); setViewedEntry(null); setThumbs({}); setConvo([]); setErrorMsg(null); setSkipRelPicker(false); setLandingBarFocused(false); setLandingSheetOpen(false); setLandingDisclaimerOpen(false); setMobileFlow(false); setClueText(""); setClueChat([]); setAdaptiveQuestion(null); setClarificationCount(0); setSignals([]); setEditingSignals(false); setResultIndex(0); setFavoriteGifts([]); setActiveSearchId(""); setSelectedFavorite(null); setExpandedFavoriteSearch(null); setRefineBaseGift(null); setRefineText(""); setRefineChoices([]); setRefinementRound(0);
  }
  function restartAtSearch() {
    restart();
    window.setTimeout(() => {
      document.querySelector(".gc-v3-start")?.scrollIntoView({ block:"start", behavior:"auto" });
    }, 80);
  }
  /* ── API call ── */
  function buildRecipientAndLocale() {
    const budgetMax = g.budget >= 500 ? 2000 : Math.round(g.budget * 1.15);
    const budgetMin = Math.max(10, Math.round(g.budget * 0.70));
    const occLabel  = g.occasion ? (tr.occ[g.occasion] ?? g.occasion) : "Gift";
    const locale: UserLocale = {
      countryCode: lang.country === "United Kingdom" ? "GB" : lang.country === "Italia" ? "IT" : "US",
      countryName: lang.country,
      currency: lang.currency,
      currencySymbol: lang.sym,
      amazonDomain: "amazon.it", // testing phase — only amazon.it affiliate link exists right now
      language: lang.t,
    };
    const recipient = {
      name: g.recipientName || "",
      age: fmtAge(g.age),
      relation: g.relationship,
      gender: g.gender,
      occasion: occLabel,
      interests: [...g.interests, ...(g.customInterest.trim() ? [g.customInterest.trim()] : [])].join(", "),
      budgetMin, budgetMax,
      notes: [
        ...g.interests.map(label => {
          const idx = tr.intr.indexOf(label);
          const ans = idx !== -1 ? g.interestDeepDive[idx] : undefined;
          if (!ans) return "";
          const parts = [ans.detail, ans.context, ans.level, ans.brand].map(s => s.trim()).filter(Boolean);
          return parts.length ? `${label}: ${parts.join(" | ")}` : "";
        }),
        g.details,
      ].filter(Boolean).join(". "),
    };
    return { recipient, locale };
  }

  function buildMobileRecipientAndLocale() {
    const { recipient, locale } = buildRecipientAndLocale();
    return {
      locale,
      recipient: {
        ...recipient,
        age: "unknown",
        relation: "",
        gender: "",
        interests: signals.map(signal => signal.key).filter(Boolean).join(", "),
        budgetMin: 0,
        budgetMax: g.budget >= 500 ? 2000 : g.budget,
        notes: [
          clueText.trim(),
          signals.length ? `Segnali confermati: ${signals.map(signal => `${signal.key}: ${signal.value}`).join("; ")}` : "",
        ].filter(Boolean).join(". "),
      },
    };
  }

  function fallbackSignalsFromText(text: string): ProfileSignal[] {
    const chunks = text
      .split(/[.!?;\n]+|,\s*/)
      .flatMap(chunk => chunk.split(/\s+e\s+(?=[a-zà-ù])/i))
      .map(chunk => chunk.trim())
      .filter(chunk => chunk.length >= 4)
      .slice(0, 6);
    const labels: Array<[RegExp, string]> = [
      [/ceramic|argilla|kintsugi/i, "Ceramica"],
      [/trek|cammin|montagn|escursion/i, "Trekking"],
      [/giappon|japan/i, "Giappone"],
      [/fotograf|foto|camera/i, "Fotografia"],
      [/cucin|chef|ricett/i, "Cucina"],
      [/music|vinil|concert|chitarr/i, "Musica"],
      [/legg|libr|roman/i, "Lettura"],
      [/viagg|vacanz/i, "Viaggi"],
      [/tropp|non |evita|odia|lament/i, "Vincolo importante"],
    ];
    const seen = new Set<string>();
    return chunks.map((value, index) => {
      const key = labels.find(([pattern]) => pattern.test(value))?.[1]
        ?? value.split(/\s+/).slice(0, 3).join(" ").replace(/^./, char => char.toUpperCase())
        ?? `Segnale ${index + 1}`;
      return { key, value };
    }).filter(signal => {
      const id = signal.key.toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function normalizeMobileGifts(items: GiftSuggestion[], round: number) {
    const batch = Date.now().toString(36);
    return items.slice(0, 6).map((gift, index) => ({ ...gift, id:`mobile-${round}-${batch}-${gift.id || index}` }));
  }

  function toggleVoiceInput() {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError("La dettatura non è disponibile in questo browser. Puoi usare il microfono della tastiera.");
      return;
    }
    setVoiceError("");
    speechBaseTextRef.current = clueText.trim();
    const recognition = new Recognition();
    recognition.lang = SPEECH_LOCALES[lang.t as TKey] ?? "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = event => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }
      const base = speechBaseTextRef.current;
      setClueText(`${base}${base && transcript.trim() ? " " : ""}${transcript.trimStart()}`);
    };
    recognition.onerror = event => {
      setIsListening(false);
      setVoiceError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Per registrare, consenti a Gifty di usare il microfono."
        : "Non ho capito bene. Tocca il microfono e riprova.");
    };
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceError("Il microfono è già in uso. Riprova tra un momento.");
    }
  }

  function mergeProfileSignals(current: ProfileSignal[], incoming: ProfileSignal[]) {
    const unique = new Map<string, ProfileSignal>();
    [...current, ...incoming].forEach(signal => {
      if (!signal.key?.trim() || !signal.value?.trim()) return;
      unique.set(`${signal.key.trim().toLocaleLowerCase()}|${signal.value.trim().toLocaleLowerCase()}`, {
        key:signal.key.trim(), value:signal.value.trim(),
      });
    });
    return [...unique.values()].slice(0, 10);
  }

  function clueObservation(messages: ChatMessage[]) {
    return messages
      .filter(message => message.role === "user")
      .map((message, index) => `${index === 0 ? "Descrizione iniziale" : `Chiarimento ${index}`}: ${message.content}`)
      .join("\n");
  }

  async function generateClarifiedResults(messages: ChatMessage[], inferredSignals: ProfileSignal[]) {
    setScreen("loading");
    setLoadingLine(0);
    setAdaptiveQuestion(null);
    setSignals(inferredSignals);
    const observation = clueObservation(messages);
    const { recipient:baseRecipient, locale } = buildRecipientAndLocale();
    const recipient = {
      ...baseRecipient,
      age:"unknown",
      relation:"",
      gender:"",
      interests:inferredSignals.map(signal => signal.key).join(", "),
      budgetMin:0,
      budgetMax:g.budget >= 500 ? 2000 : g.budget,
      notes:observation,
    };
    const firstMessage = [
      `Sto cercando un regalo per ${g.recipientName || "questa persona"}.`,
      `Occasione: ${g.occasion || "non specificata"}. Budget massimo: ${sym}${g.budget}.`,
      observation,
      inferredSignals.length ? `Criteri rilevati: ${inferredSignals.map(signal => `${signal.key}: ${signal.value}`).join("; ")}.` : "",
      "Ora proponi le idee più personali e acquistabili emerse dall'intera conversazione.",
    ].filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ recipient, messages:[{ role:"user", content:firstMessage }], reactions:{}, locale }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: ChatResponse = await res.json();
      const newGifts = normalizeMobileGifts(data.suggestions ?? [], 0);
      if (!newGifts.length) throw new Error("No suggestions");
      setClueText(observation);
      setGifts(newGifts);
      setResultIndex(0);
      setConvo([{ role:"user", content:firstMessage }, { role:"assistant", content:data.message ?? "" }]);
      pushHistoryEntry(newGifts);
      setScreen("results");
    } catch {
      setErrorMsg("Non sono riuscito a creare i risultati. Riprova tra poco.");
      setScreen("clues");
    } finally {
      setSignalsBusy(false);
    }
  }

  async function organizeClues(messageOverride?: string) {
    const message = (messageOverride ?? clueText).trim();
    if (message.length < 2 || signalsBusy) return;
    const userMessage: ChatMessage = { role:"user", content:message };
    const nextChat = [...clueChat, userMessage];
    const previousQuestion = [...clueChat].reverse().find(item => item.role === "assistant")?.content;
    setClueChat(nextChat);
    setClueText("");
    setSignalsBusy(true);
    setErrorMsg(null);
    setAdaptiveQuestion(null);
    const observation = clueObservation(nextChat);
    const { recipient:baseRecipient, locale } = buildRecipientAndLocale();
    try {
      const res = await fetch("/api/adaptive-question", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          recipient:{ ...baseRecipient, notes:observation, budgetMin:0, budgetMax:g.budget },
          observation,
          previousQuestion,
          previousAnswer:previousQuestion ? message : undefined,
          conversation:nextChat,
          questionCount:clarificationCount,
          locale,
        }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: AdaptiveQuestionResult = await res.json();
      const nextSignals = mergeProfileSignals(signals, data.signals ?? []);
      setSignals(nextSignals);
      if (data.ready_to_recommend || clarificationCount >= 3) {
        await generateClarifiedResults(nextChat, nextSignals);
        return;
      }
      setAdaptiveQuestion(data);
      setClarificationCount(count => count + 1);
      setClueChat([...nextChat, { role:"assistant", content:data.domanda_scelta }]);
      setSignalsBusy(false);
    } catch {
      if (clarificationCount === 0) {
        const fallbackQuestion = `Quando ${g.recipientName || "questa persona"} riceve un regalo, apprezza di più qualcosa di utile, personale o da vivere?`;
        setAdaptiveQuestion({ signals:[], incertezza_principale:"Tipo di regalo", domanda_scelta:fallbackQuestion, opzioni:[] });
        setClarificationCount(1);
        setClueChat([...nextChat, { role:"assistant", content:fallbackQuestion }]);
        setSignalsBusy(false);
      } else {
        await generateClarifiedResults(nextChat, signals);
      }
    }
  }

  async function generateMobileResults() {
    if (signals.length === 0) return;
    setScreen("loading");
    setLoadingLine(0);
    setErrorMsg(null);
    const { recipient, locale } = buildMobileRecipientAndLocale();
    const firstMessage = [
      `Sto cercando un regalo per ${g.recipientName || "questa persona"}.`,
      `Occasione: ${g.occasion || "non specificata"}. Budget massimo: ${sym}${g.budget}.`,
      `Quello che ho osservato: ${clueText.trim()}.`,
      `Segnali confermati: ${signals.map(signal => `${signal.key} — ${signal.value}`).join("; ")}.`,
      "Proponi le idee più personali e acquistabili, usando tutti i segnali insieme quando sono compatibili e direzioni diverse quando raccontano lati distinti della persona.",
    ].join("\n");
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ recipient, messages:[{ role:"user", content:firstMessage }], reactions:{}, locale }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: ChatResponse = await res.json();
      const newGifts = normalizeMobileGifts(data.suggestions ?? [], 0);
      if (!newGifts.length) throw new Error("No suggestions");
      setGifts(newGifts);
      setResultIndex(0);
      setConvo([{ role:"user", content:firstMessage }, { role:"assistant", content:data.message ?? "" }]);
      pushHistoryEntry(newGifts);
      setScreen("results");
    } catch {
      setErrorMsg("Non sono riuscito a creare i risultati. Riprova tra poco.");
      setScreen("clues");
    }
  }

  function persistFavoriteSearches(searches: FavoriteSearchGroup[]) {
    setFavoriteSearches(searches);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(searches)); } catch { /* ignore */ }
  }

  function saveCurrentSearchFavorites(nextGifts: GiftSuggestion[]) {
    const searchId = activeSearchId || `favorite-search-${Date.now()}`;
    if (!activeSearchId) setActiveSearchId(searchId);
    const nextGroup: FavoriteSearchGroup = {
      id:searchId,
      name:g.recipientName || "Destinatario",
      occasion:g.occasion || "Occasione non indicata",
      budget:g.budget,
      currencySymbol:sym,
      gifts:nextGifts,
      gathered:{ ...g, interests:[...g.interests], interestDeepDive:{ ...g.interestDeepDive } },
      clueText,
      signals:signals.map(signal => ({ ...signal })),
      conversation:convo.map(message => ({ ...message })),
      languageIndex:langIdx,
      savedAt:Date.now(),
    };
    const withoutCurrent = favoriteSearches.filter(search => search.id !== searchId);
    persistFavoriteSearches(nextGifts.length ? [nextGroup, ...withoutCurrent] : withoutCurrent);
  }

  function toggleFavorite(gift: GiftSuggestion) {
    const nextFavorites = favoriteGifts.some(item => item.id === gift.id)
      ? favoriteGifts.filter(item => item.id !== gift.id)
      : [...favoriteGifts, gift];
    setFavoriteGifts(nextFavorites);
    saveCurrentSearchFavorites(nextFavorites);
  }

  function openFavorites() {
    if (screen !== "favorites" && screen !== "favorite-detail") setFavoritesReturnScreen(screen);
    setMobileFlow(true);
    setLandingSheetOpen(false);
    setLandingBarFocused(false);
    setLangMenuOpen(false);
    setSelectedFavorite(null);
    setScreen("favorites");
  }

  function scrollLandingTo(selector: string) {
    const scroller = gcMainRef.current;
    const target = scroller?.querySelector<HTMLElement>(selector);
    if (!scroller || !target) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // Native smooth scrolling and mandatory scroll snapping can compete and
    // send a click back to the previous stop. Pause snapping during the short
    // guided movement, then restore it once the requested phase is reached.
    scroller.style.scrollSnapType = "none";
    window.setTimeout(() => {
      scroller.scrollTo({ top:Math.max(0, top), behavior:reducedMotion ? "auto" : "smooth" });
      window.setTimeout(() => {
        scroller.style.scrollSnapType = "";
      }, reducedMotion ? 40 : 700);
    }, 40);
  }

  function removeFavoriteFromSavedSearch(groupId: string, giftId: string) {
    const nextSearches = favoriteSearches.flatMap(search => {
      if (search.id !== groupId) return [search];
      const remainingGifts = search.gifts.filter(gift => gift.id !== giftId);
      return remainingGifts.length ? [{ ...search, gifts:remainingGifts }] : [];
    });
    persistFavoriteSearches(nextSearches);
    if (groupId === activeSearchId) setFavoriteGifts(previous => previous.filter(gift => gift.id !== giftId));
    setSelectedFavorite(null);
    setScreen("favorites");
  }

  function refineSavedFavorite(group: FavoriteSearchGroup, gift: GiftSuggestion) {
    setG(group.gathered);
    setLangIdx(group.languageIndex);
    setClueText(group.clueText);
    setSignals(group.signals);
    setConvo(group.conversation);
    setActiveSearchId(group.id);
    setFavoriteGifts(group.gifts);
    setGifts([gift]);
    setResultIndex(0);
    setMobileFlow(true);
    setRefineBaseGift(gift);
    setRefineText("");
    setRefineChoices([]);
    setErrorMsg(null);
    setScreen("refine");
  }

  function openProductRefinement(gift: GiftSuggestion) {
    setRefineBaseGift(gift);
    setRefineText("");
    setRefineChoices([]);
    setErrorMsg(null);
    setScreen("refine");
  }

  function discardMobileGift(gift: GiftSuggestion) {
    const remaining = gifts.filter(item => item.id !== gift.id);
    const remainingFavorites = favoriteGifts.filter(item => item.id !== gift.id);
    setFavoriteGifts(remainingFavorites);
    saveCurrentSearchFavorites(remainingFavorites);
    if (!remaining.length) {
      restart();
      return;
    }
    setGifts(remaining);
    setResultIndex(index => Math.min(index, remaining.length - 1));
  }

  async function refineMobileResults() {
    if ((!refineText.trim() && refineChoices.length === 0) || refining) return;
    setRefining(true);
    setErrorMsg(null);
    const { recipient, locale } = buildMobileRecipientAndLocale();
    const baseGift = refineBaseGift ?? gifts[resultIndex];
    if (!baseGift) {
      setRefining(false);
      return;
    }
    const kept = favoriteGifts.map(gift => `"${gift.title}"`).join(", ") || "nessun preferito esplicito";
    const shown = gifts.map(gift => `"${gift.title}"`).join(", ");
    const refineMessage = [
      `Prodotto di partenza da usare come riferimento: "${baseGift.title}" — ${baseGift.reason || baseGift.description}.`,
      `Preferiti da conservare separatamente: ${kept}.`,
      `Dettagli aggiunti dall'utente per trovare prodotti simili: ${refineText.trim() || "nessun commento libero"}.`,
      refineChoices.length ? `Come deve cambiare rispetto al prodotto di partenza: ${refineChoices.join(", ")}.` : "",
      `Idee già mostrate da non ripetere: ${shown}.`,
      "Genera prodotti alternativi simili al prodotto di partenza, applicando i nuovi dettagli. Non cambiare categoria senza un motivo esplicito ed evita le idee già mostrate.",
    ].filter(Boolean).join("\n");
    try {
      const reactions = Object.fromEntries(favoriteGifts.map(gift => [gift.id, "love_it"]));
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ recipient, messages:[...convo, { role:"user", content:refineMessage }], reactions, locale, currentSuggestions:gifts }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: ChatResponse = await res.json();
      const newGifts = normalizeMobileGifts(data.suggestions ?? [], refinementRound + 1);
      if (!newGifts.length) throw new Error("No suggestions");
      setGifts(newGifts);
      setResultIndex(0);
      setConvo(previous => [...previous, { role:"user", content:refineMessage }, { role:"assistant", content:data.message ?? "" }]);
      setRefinementRound(round => round + 1);
      setRefineText("");
      setRefineChoices([]);
      setRefineBaseGift(null);
      pushHistoryEntry(newGifts);
      setScreen("results");
    } catch {
      setErrorMsg("Non sono riuscito a rifinire i risultati. I preferiti sono ancora salvati.");
    } finally {
      setRefining(false);
    }
  }

  function pushHistoryEntry(newGifts: GiftSuggestion[]) {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      emoji: OCC_EMOJI[g.occasion ?? "other"] ?? "🎁",
      name: g.recipientName || g.relationship || "?",
      occId: g.occasion ?? "other",
      count: newGifts.length,
      budgetVal: g.budget,
      when: new Date().toISOString(),
      gifts: newGifts,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 20);
      try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  async function fireRequest() {
    setScreen("loading"); setLoadingLine(0); setErrorMsg(null);
    const { recipient, locale } = buildRecipientAndLocale();
    const firstMessage = buildFirstMessage(g, sym, tr);
    try {
      const res  = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ recipient, messages:[{role:"user",content:firstMessage}], reactions:{}, locale }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: ChatResponse = await res.json();
      const newGifts = data.suggestions ?? [];
      setGifts(newGifts);
      if (newGifts.length === 0) {
        setErrorMsg("Something went wrong while finding gifts — please try again.");
      } else {
        setThumbs({});
        setConvo([
          { role:"user", content: firstMessage },
          { role:"assistant", content: data.message ?? "" },
        ]);
        pushHistoryEntry(newGifts);
      }
    } catch {
      setGifts([]);
      setErrorMsg("Something went wrong while finding gifts — please try again.");
    }
    setScreen("results");
  }

  /* ── Refine using 👍/👎 thumbs feedback ── */
  async function refineRequest() {
    if (Object.keys(thumbs).length === 0 || refining) return;
    setRefining(true); setErrorMsg(null);
    const { recipient, locale } = buildRecipientAndLocale();

    const allTitles = gifts.map(gf => `"${gf.title}"`).join(", ");
    const thumbLines = gifts
      .filter(gf => thumbs[gf.id] != null)
      .map(gf => `- "${gf.title}": ${thumbs[gf.id] === "up" ? "👍 liked" : "👎 disliked"}`)
      .join("\n");
    const refineMessage = `Here is my feedback on your suggestions:\n${thumbLines}\n\nIMPORTANT: Do NOT suggest any of these gifts again (they've already been shown): ${allTitles}.\n\nPlease give me a completely new set of suggestions based on this feedback — don't ask me the intake questions again.`;
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ recipient, messages:[...convo, { role:"user", content: refineMessage }], reactions:{}, locale }),
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: ChatResponse = await res.json();
      const newGifts = data.suggestions ?? [];
      if (newGifts.length === 0) {
        setErrorMsg("Something went wrong while refining — your previous suggestions are still here, please try again.");
      } else {
        setGifts(newGifts);
        setThumbs({});
        setConvo(prev => [
          ...prev,
          { role:"user", content: refineMessage },
          { role:"assistant", content: data.message ?? "" },
        ]);
        pushHistoryEntry(newGifts);
      }
    } catch {
      setErrorMsg("Something went wrong while refining — your previous suggestions are still here, please try again.");
    }
    setRefining(false);
  }

  /* ── Sorted gifts ── */
  const currentGifts = viewedEntry ? viewedEntry.gifts : gifts;
  const sorted = [...currentGifts].sort((a, b) => {
    if (sortBy === "price")     return parsePriceLow(a.priceRange) - parsePriceLow(b.priceRange);
    if (sortBy === "priceHigh") return parsePriceLow(b.priceRange) - parsePriceLow(a.priceRange);
    return 0; // "match" = keep the order Claude proposed them in
  });
  const desktopStage = screen === "clues" ? 0
    : screen === "loading" ? 1
    : screen === "results" || screen === "refine" || screen === "favorites" || screen === "favorite-detail" ? 2
    : 0;

  /* ── Time label ── */
  function whenLabel(isoStr: string) {
    const diff = Date.now() - new Date(isoStr).getTime();
    if (diff < 60000 * 5) return tr.whenNow;
    if (diff < 86400000 * 3) return tr.whenD2;
    if (diff < 86400000 * 10) return tr.whenW1;
    return tr.whenW3;
  }

  /* ── Gift card component ── */
  function GiftCard({ gift, showRating = false }: { gift: GiftSuggestion; showRating?: boolean }) {
    const imgQ      = gift.imageSearchQuery ?? gift.title;
    const productLink = gift.officialLink ?? gift.amazonLink ?? gift.link;
    const ogImg = productLink
      ? `/api/product-image?url=${encodeURIComponent(productLink)}&q=${encodeURIComponent(imgQ)}`
      : `/api/product-image?q=${encodeURIComponent(imgQ)}`;
    const fallbackImg = ogImg;
    const [imgSrc, setImgSrc] = useState(gift.imageUrl || ogImg);
    // No web search anymore → gifts have no exact product URL. The button
    // links to an amazon.it search for the product name; the affiliate tag is
    // added by addAffiliateTag, so purchases within 24h are still credited.
    const fallbackLink = `https://www.amazon.it/s?k=${encodeURIComponent(gift.title)}`;
    const officialLink = gift.officialLink || gift.link;
    const amazonLink   = gift.amazonLink;
    const thumb  = thumbs[gift.id];
    return (
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden", boxShadow:"0 4px 18px rgba(124,63,63,.06)", display:"flex", flexDirection:"column" }}>
        <div style={{ height:170, background:"linear-gradient(140deg,#f0e3d2,#dcc09e)", position:"relative", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgSrc} alt={gift.title} loading="lazy"
            onError={() => { if (imgSrc !== fallbackImg) setImgSrc(fallbackImg); }}
            style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          {/* Category pill — bottom left */}
          {gift.category && (
            <span style={{ position:"absolute", left:11, bottom:9, zIndex:1, fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:"#fff", background:"rgba(42,33,29,.42)", padding:"3px 8px", borderRadius:999, backdropFilter:"blur(2px)" }}>
              {gift.category}
            </span>
          )}
        </div>
        <div style={{ padding:"16px 17px 17px", display:"flex", flexDirection:"column", flex:1 }}>
          <div style={{ fontFamily:BODY, fontWeight:700, fontSize:15.5, lineHeight:1.3, color:C.ink, marginBottom:14 }}>{gift.title}</div>


          <div style={{ marginTop:"auto" }}>
            {(() => {
              const nums = (gift.priceRange.match(/\d+/g) || []).map(Number);
              const highPrice = nums.length > 0 ? Math.max(...nums) : 0;
              const overBudget = g.budget < 500 && highPrice > g.budget * 1.15;
              return (
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:20, color: overBudget ? "#c0392b" : C.ink }}>{toPriceBand(gift.priceRange, sym)}</span>
                  {overBudget && <span style={{ fontSize:11, fontWeight:700, color:"#c0392b", background:"#fde8e8", padding:"2px 7px", borderRadius:999 }}>Over budget</span>}
                </div>
              );
            })()}
            <div style={{ display:"flex", gap:8 }}>
              <a href={addAffiliateTag(amazonLink || fallbackLink)} target="_blank" rel="noopener noreferrer"
                style={{ flex:1, textAlign:"center" as const, padding:"9px 12px", borderRadius:10, border:"none", background:C.maroon, color:"#fff", font:`600 13.5px ${BODY}`, cursor:"pointer", textDecoration:"none", display:"inline-block" }}>
                🛒 {tr.buyOnAmazon}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderMobileFlowHeader(progress: number) {
    return (
      <div className="gc-flow-header" style={{ margin:"-24px -20px 16px", padding:"15px 20px 12px", background:"linear-gradient(135deg,#17303e 0%,#203746 58%,#294b59 100%)", borderBottom:"1px solid rgba(255,193,159,.28)", boxShadow:"0 8px 24px rgba(21,43,56,.16)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:11 }}>
          <button onClick={restart} style={{ display:"flex", alignItems:"center", gap:9, border:0, padding:0, background:"transparent", cursor:"pointer", textAlign:"left" }}>
            <span style={{ width:34, height:34, borderRadius:10, display:"grid", placeItems:"center", background:"linear-gradient(145deg,#ffc19f,#ef735f)", boxShadow:"0 4px 12px rgba(9,29,40,.25)" }}><GiftSVG size={18} fill="#152b38"/></span>
            <span>
              <strong style={{ display:"block", color:C.ink, fontFamily:DISPLAY, fontSize:17, lineHeight:1 }}>Gifty</strong>
              <small style={{ color:C.muted4, fontSize:9.5 }}>{g.recipientName} · {g.occasion} · max {fmtBudget(g.budget, sym)}</small>
            </span>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button type="button" onClick={openFavorites} aria-label={`Apri ${totalFavoriteCount} preferiti salvati`} style={{ minWidth:35, height:34, padding:"0 8px", borderRadius:999, border:"1px solid #d5b995", background:"rgba(255,250,244,.72)", display:"flex", alignItems:"center", justifyContent:"center", gap:3, color:C.maroon, fontSize:12, fontWeight:700, cursor:"pointer" }}>
              <span aria-hidden="true">♡</span>{totalFavoriteCount || ""}
            </button>
            <div ref={langMenuRef} style={{ position:"relative" }}>
              <button type="button" onClick={() => setLangMenuOpen(open => !open)} style={{ height:34, padding:"0 10px", borderRadius:999, border:"1px solid #d5b995", background:"rgba(255,250,244,.72)", color:C.label, font:`700 11px ${BODY}`, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                {lang.flag} {lang.code} <span style={{ opacity:.5, fontSize:8 }}>▾</span>
              </button>
              {langMenuOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 7px)", right:0, minWidth:195, overflow:"hidden", border:`1px solid ${C.border}`, borderRadius:12, background:"#fff", boxShadow:"0 12px 28px rgba(50,28,22,.16)", zIndex:60 }}>
                  {LANGS.map((language, index) => (
                    <button key={language.code} type="button" onClick={() => { setLangIdx(index); setLangMenuOpen(false); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"10px 13px", border:0, background:index === langIdx ? "#f7eee3" : "#fff", color:C.body, font:`${index === langIdx ? 700 : 500} 13px ${BODY}`, cursor:"pointer", textAlign:"left" }}>
                      <span>{language.flag} {language.name}</span><span style={{ color:C.muted2, fontSize:10 }}>{language.currency}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ height:4, borderRadius:99, overflow:"hidden", background:"#ddcdb9" }}>
          <div style={{ height:"100%", width:`${Math.max(8, Math.min(100, progress))}%`, borderRadius:99, background:"linear-gradient(90deg,#a95c5d,#7c3f3f)", transition:"width .35s ease" }}/>
        </div>
      </div>
    );
  }

  function renderMobileResultCard(gift: GiftSuggestion) {
    const imgQ = gift.imageSearchQuery ?? gift.title;
    const image = gift.imageUrl || `/api/product-image?q=${encodeURIComponent(imgQ)}`;
    const fallbackLink = `https://www.amazon.it/s?k=${encodeURIComponent(gift.title)}`;
    const amazonLink = addAffiliateTag(gift.amazonLink || fallbackLink);
    const loved = favoriteGifts.some(item => item.id === gift.id);
    return (
      <article style={{ border:"1px solid #dfc8af", borderRadius:18, background:"#fffaf4", padding:8, boxShadow:"0 12px 28px rgba(91,45,39,.09)" }}>
        <div style={{ height:150, borderRadius:13, overflow:"hidden", position:"relative", background:"linear-gradient(145deg,#ead8c4,#d8b99b)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={gift.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          <span style={{ position:"absolute", left:10, top:10, padding:"5px 8px", borderRadius:999, color:"#fff8ed", background:"rgba(73,36,39,.55)", backdropFilter:"blur(5px)", fontSize:9, fontWeight:700, letterSpacing:".08em", textTransform:"uppercase" }}>{gift.category || "Scelta personale"}</span>
        </div>
        <div style={{ padding:"10px 3px 2px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ color:"#a15b58", fontSize:8.5, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", marginBottom:5 }}>{refinementRound ? "Nuova alternativa" : "Scelta ad alta affinità"}</div>
              <h2 style={{ margin:"0 0 5px", color:C.ink, fontFamily:DISPLAY, fontSize:19, lineHeight:1.12, letterSpacing:"-.02em" }}>{gift.title}</h2>
            </div>
            <strong style={{ whiteSpace:"nowrap", color:C.maroon, fontFamily:DISPLAY, fontSize:17 }}>{toPriceBand(gift.priceRange, sym)}</strong>
          </div>
          <p style={{ margin:"0 0 9px", color:C.muted4, fontSize:11.5, lineHeight:1.38, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{gift.reason || gift.description}</p>
          <a href={amazonLink} target="_blank" rel="noopener noreferrer" style={{ display:"block", width:"100%", padding:"11px 12px", borderRadius:11, boxSizing:"border-box", textAlign:"center", textDecoration:"none", color:"#fff", background:C.maroon, fontSize:12.5, fontWeight:700 }}>
            Acquista su Amazon
          </a>
          <button type="button" onClick={() => openProductRefinement(gift)} style={{ width:"100%", minHeight:39, marginTop:7, border:"1px solid #d2b494", borderRadius:10, background:"#fffaf4", color:C.maroon, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
            Trova alternative simili
          </button>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginTop:7 }}>
            <button type="button" onClick={() => toggleFavorite(gift)} aria-label={loved ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              style={{ minHeight:36, borderRadius:10, border:`1px solid ${loved ? "#9f5959" : "#dec7ae"}`, background:loved ? "#f3e2dc" : "transparent", color:C.maroon, cursor:"pointer", fontSize:10.5, fontWeight:700 }}>
              {loved ? "♥ Nei preferiti" : "♡ Aggiungi ai preferiti"}
            </button>
            <button type="button" onClick={() => discardMobileGift(gift)} style={{ minHeight:36, borderRadius:10, border:"1px solid #decfc0", background:"transparent", color:C.muted4, cursor:"pointer", fontSize:10.5, fontWeight:700 }}>
              ⌫ Scarta
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderDesktopResultCard(gift: GiftSuggestion, index: number) {
    const imgQ = gift.imageSearchQuery ?? gift.title;
    const image = gift.imageUrl || `/api/product-image?q=${encodeURIComponent(imgQ)}`;
    const fallbackLink = `https://www.amazon.it/s?k=${encodeURIComponent(gift.title)}`;
    const amazonLink = addAffiliateTag(gift.amazonLink || fallbackLink);
    const loved = favoriteGifts.some(item => item.id === gift.id);
    return (
      <article key={gift.id} className="gc-desktop-result-card">
        <div className="gc-desktop-result-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={gift.title}/>
          <span>{gift.category || "Scelta personale"}</span>
          <button type="button" onClick={() => toggleFavorite(gift)} aria-label={loved ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}>{loved ? "♥" : "♡"}</button>
        </div>
        <div className="gc-desktop-result-body">
          <small>IDEA {String(index + 1).padStart(2, "0")}</small>
          <div className="gc-desktop-result-title"><h2>{gift.title}</h2><strong>{toPriceBand(gift.priceRange, sym)}</strong></div>
          <p>{gift.reason || gift.description}</p>
          <div className="gc-desktop-result-actions">
            <a href={amazonLink} target="_blank" rel="noopener noreferrer">Acquista su Amazon</a>
            <button type="button" onClick={() => openProductRefinement(gift)}>Rifinisci questa idea</button>
          </div>
          <button type="button" className="gc-desktop-discard" onClick={() => discardMobileGift(gift)}>Scarta</button>
        </div>
      </article>
    );
  }

  /* ─────────────────────────────── RENDER ─────────────────────── */
  return (
    <>
      {/* Written with dangerouslySetInnerHTML, not as a text child: React
          HTML-escapes text children during server rendering, which turned
          every child combinator in here into ".foo&gt;bar" and silently
          killed those rules (the close button of the legal popup, the photo
          clipping on the hero cards, the search-bar icon, and ~12 more). */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes gcfade  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        @keyframes gcorbit { to{transform:rotate(360deg)} }
        @keyframes gcpulse { 0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)} }
        @keyframes gcbob   { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
        @keyframes gcLoaderTurn { to{transform:rotate(360deg)} }
        @keyframes gcLoaderCounterTurn { to{transform:rotate(-360deg)} }
        @keyframes gcLoaderGlow { 0%,100%{transform:scale(.94);opacity:.45}50%{transform:scale(1.08);opacity:.8} }
        @keyframes gcLoaderCard { 0%,100%{transform:translateY(2px) rotate(-4deg);opacity:.72}50%{transform:translateY(-7px) rotate(3deg);opacity:1} }
        @keyframes gcLoaderSweep { to{transform:rotate(360deg)} }
        @keyframes gcLoaderCore { 0%,100%{transform:translateY(2px) scale(.96);border-radius:24px}45%{transform:translateY(-5px) scale(1.04);border-radius:20px}70%{transform:translateY(-2px) scale(1)} }
        @keyframes gcLoaderNode { 0%,100%{transform:translateY(2px) scale(.92);opacity:.65}45%{transform:translateY(-5px) scale(1.08);opacity:1} }
        @keyframes gcLoaderScan { 0%,18%{transform:translateY(-42px);opacity:0}28%{opacity:.8}68%{opacity:.55}82%,100%{transform:translateY(42px);opacity:0} }
        @keyframes gcLoaderSpark { 0%,100%{transform:scale(.35) rotate(0);opacity:0}42%{transform:scale(1.15) rotate(90deg);opacity:1}68%{transform:scale(.7) rotate(160deg);opacity:.45} }
        @keyframes gcVoicePulse { 0%,100%{box-shadow:0 0 0 0 rgba(124,63,63,.28)}50%{box-shadow:0 0 0 7px rgba(124,63,63,0)} }
        @keyframes gcbarglow {
          0%,100% { box-shadow:0 0 0 5px rgba(201,162,107,.32),0 10px 26px rgba(124,63,63,.28); }
          50%     { box-shadow:0 0 0 9px rgba(201,162,107,.48),0 12px 30px rgba(124,63,63,.38); }
        }
        @keyframes gcBarShine { 0%,25%{transform:translateX(-150%) skewX(-20deg)} 60%,100%{transform:translateX(420%) skewX(-20deg)} }
        @keyframes gcStartCue { 0%,100%{transform:translateY(0)} 50%{transform:translateY(2px)} }
        .gc-bar-pulse { animation:gcbarglow 2.4s ease-in-out infinite; }
        .gc-start-bar{position:relative;overflow:hidden}
        .gc-start-bar:after{content:"";position:absolute;inset:-8px auto -8px -30%;width:18%;background:linear-gradient(90deg,transparent,rgba(255,235,191,.7),transparent);animation:gcBarShine 2.4s ease-in-out infinite;pointer-events:none}
        .gc-start-cue{animation:gcStartCue 2.4s ease-in-out infinite}
        .gc-landing-sheet{transition:height .38s cubic-bezier(.22,.8,.28,1),border-radius .28s ease,box-shadow .28s ease}
        .gc-landing-sheet-field{display:flex;align-items:center;gap:11px;width:100%;min-height:54px;padding:8px 12px 8px 14px;border:1.5px solid #dec9af;border-radius:15px;background:#fffdf9;transition:border-color .18s ease,box-shadow .18s ease}
        .gc-landing-sheet-field:focus-within{border-color:#c9a26b;box-shadow:0 0 0 3px rgba(201,162,107,.15)}
        .gc-landing-sheet-field label{display:block;margin-bottom:2px;color:#7c3f3f;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
        .gc-landing-sheet-field input[type=text]{width:100%;padding:0;border:0!important;outline:none;background:transparent;color:#2a211d;font:500 16px 'Hanken Grotesk',sans-serif}
        .gc-landing-sheet-field input[type=range]{margin:5px 0 1px}
        .gc-landing-sheet-handle{width:38px;height:4px;margin:0 auto 10px;border-radius:99px;background:#cbb8a1}
        .gc-shell:has(.gc-landing) .gc-brand{display:none!important}
        .gc-shell:has(.gc-landing) .gc-main{padding:0!important}
        .gc-landing{position:relative;display:block!important;min-height:calc(100dvh + 720px)!important;padding:0!important;background:linear-gradient(145deg,#17303e 0%,#203746 48%,#2b4b58 100%)!important}
        .gc-landing>:not(.gc-landing-v2){display:none!important}
        .gc-landing-legacy{display:none!important}
        .gc-landing-v2{position:sticky;top:0;height:100dvh;min-height:620px;box-sizing:border-box;overflow:hidden;padding:18px clamp(20px,4vw,62px) 132px;color:#fff4e8;background:radial-gradient(circle at 82% 20%,rgba(255,193,159,.09),transparent 25%),linear-gradient(145deg,#17303e 0%,#203746 54%,#294b59 100%)}
        .gc-landing-v2:before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.2;background-image:radial-gradient(rgba(255,255,255,.32) .55px,transparent .7px);background-size:8px 8px;mask-image:linear-gradient(to bottom,#000,transparent 78%)}
        .gc-landing-v2-header{position:relative;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:16px;max-width:1320px;margin:0 auto}
        .gc-v2-brand{display:flex;align-items:center;gap:13px;padding:0;border:0;background:transparent;color:#fff4e8;text-align:left;cursor:pointer;transition:transform .2s ease,opacity .2s ease}
        .gc-v2-brand:hover{transform:translateY(-1px);opacity:.92}
        .gc-v2-logo{width:52px;height:52px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.42);border-radius:16px;background:linear-gradient(145deg,#ffd0ad 0%,#ef735f 78%);box-shadow:0 11px 26px rgba(239,115,95,.3),inset 0 1px 0 rgba(255,255,255,.72);transform:rotate(-3deg)}
        /* One font for the whole wordmark. It was set in an italic serif,
           where the lowercase "Gifty" and the capital "AI" read as two
           different typefaces even though they weren't. */
        .gc-v2-wordmark{display:flex;flex-direction:column;gap:8px}.gc-v2-wordmark strong{display:block;font-family:'Bricolage Grotesque',sans-serif;font-size:33px;font-weight:800;font-style:normal;line-height:.9;letter-spacing:-.045em;text-shadow:0 4px 18px rgba(0,0,0,.24)}.gc-v2-wordmark small{display:block;margin-left:2px;font-family:'Hanken Grotesk',sans-serif;font-size:8.5px;font-weight:850;line-height:1.15;letter-spacing:.19em;color:#ffc19f}
        .gc-v2-actions{display:flex;align-items:center;gap:10px}.gc-v2-pill{height:46px;min-width:46px;padding:0 14px;border:1px solid rgba(255,244,232,.34);border-radius:999px;background:rgba(255,244,232,.08);box-shadow:0 10px 26px rgba(3,18,27,.22),inset 0 1px 0 rgba(255,255,255,.12);color:#fff4e8;font:800 12px 'Hanken Grotesk',sans-serif;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;backdrop-filter:blur(12px);transition:transform .2s ease,border-color .2s ease,background .2s ease}.gc-v2-pill:hover{transform:translateY(-2px);border-color:rgba(255,193,159,.66);background:rgba(255,193,159,.14)}
        .gc-v2-favorites{width:46px;padding:0;color:#ffc19f}.gc-v2-favorites svg{width:21px;height:21px;filter:drop-shadow(0 3px 8px rgba(239,115,95,.24))}.gc-v2-favorites-count{font-size:10px;color:#fff4e8}
        .gc-v2-language{padding:0 13px 0 11px}.gc-v2-language svg{width:18px;height:18px;color:#ffc19f}.gc-v2-language strong{font-size:12px;letter-spacing:.06em}.gc-v2-language-chevron{width:10px!important;height:10px!important;color:#fff4e8!important;opacity:.62}
        .gc-v2-language-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:30;width:210px;overflow:hidden;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:#fff8ef;box-shadow:0 18px 40px rgba(3,17,26,.32)}.gc-v2-language-menu button{width:100%;padding:10px 13px;border:0;border-bottom:1px solid #eee0d3;background:transparent;color:#203746;display:flex;justify-content:space-between;font:600 12px 'Hanken Grotesk',sans-serif;cursor:pointer}
        .gc-v2-layout{position:relative;z-index:2;max-width:1320px;height:calc(100% - 72px);margin:0 auto;display:grid;grid-template-columns:minmax(310px,.8fr) minmax(610px,1.45fr);align-items:center;gap:clamp(28px,5vw,86px)}
        .gc-v2-hero{align-self:center;padding-bottom:34px}.gc-v2-eyebrow{margin:0 0 17px;color:#a9bfbd;font-size:10px;font-weight:800;letter-spacing:.18em}.gc-v2-hero h1{max-width:560px;margin:0;color:#fff4e8;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(43px,5vw,76px);font-weight:650;line-height:.98;letter-spacing:-.055em}.gc-v2-hero h1 em{display:inline-block;margin-top:8px;color:#ef735f;font-family:Georgia,serif;font-weight:400;letter-spacing:-.045em}
        .gc-v2-benefits{display:flex;align-items:center;gap:11px;margin-top:25px;color:#d7e1df;font-size:13px;font-weight:650}.gc-v2-benefits i{width:4px;height:4px;border-radius:50%;background:#ffc19f}.gc-v2-scroll-cue{display:flex;align-items:center;gap:9px;margin:28px 0 0;color:#91aaa9;font-size:11px}.gc-v2-scroll-cue b{display:grid;place-items:center;width:25px;height:25px;border:1px solid rgba(255,255,255,.18);border-radius:50%;color:#ffc19f}
        .gc-v2-story{position:relative;height:430px;align-self:center}.gc-v2-route{position:absolute;left:0;right:0;top:36px;width:100%;height:210px;overflow:visible}.gc-v2-route path:last-child{transition:stroke-dashoffset .12s linear;filter:drop-shadow(0 0 6px rgba(239,115,95,.45))}
        /* Hero coverflow. The wrapper owns the perspective; the track is a
           zero-size anchor at dead centre and every card is absolutely
           placed on the arc from JS (see the hero-carousel effect). Edge to
           edge on purpose — the lane is 100vw regardless of page padding. */
        .gc-v3-marquee{position:relative;width:100vw;max-width:100vw;flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;perspective:1250px;perspective-origin:50% 50%;overflow-x:clip;-webkit-mask-image:linear-gradient(90deg,transparent,#000 11%,#000 89%,transparent);mask-image:linear-gradient(90deg,transparent,#000 11%,#000 89%,transparent)}
        .gc-v3-marquee-track{position:relative;width:0;height:0;transform-style:preserve-3d}
        .gc-v3-marquee-card{--gc-card-panel:150px;position:absolute;top:0;left:0;height:min(58vh,600px);aspect-ratio:4/5;margin-top:calc(min(58vh,600px) / -2);margin-left:calc(min(58vh,600px) * 0.4 * -1);border:1px solid rgba(255,255,255,.13);border-radius:26px;overflow:hidden;background:#102733;box-shadow:0 28px 64px rgba(0,0,0,.48);will-change:transform,opacity;backface-visibility:hidden}
        .gc-v3-marquee-card>img{position:absolute;left:0;right:0;top:0;width:100%;height:calc(100% - var(--gc-card-panel));object-fit:cover;display:block}
        .gc-v3-marquee-fade{position:absolute;left:0;right:0;top:0;height:calc(100% - var(--gc-card-panel));background:linear-gradient(180deg,rgba(21,43,56,.02) 58%,rgba(10,31,41,.25) 100%);pointer-events:none}
        .gc-v3-marquee-cat{position:absolute;top:16px;left:16px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.2);backdrop-filter:blur(4px);color:#fff4e8;font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
        .gc-v3-marquee-body{position:absolute;left:0;right:0;bottom:0;height:var(--gc-card-panel);box-sizing:border-box;padding:15px 15px 12px;display:flex;flex-direction:column;align-items:center;border-top:1px solid rgba(255,255,255,.14);background:linear-gradient(155deg,#102b38,#0b202b);box-shadow:0 -12px 28px rgba(4,19,27,.12),inset 0 1px 0 rgba(255,255,255,.05);color:#fff4e8;text-align:center}
        .gc-v3-marquee-body strong{min-height:40px;display:flex;align-items:center;justify-content:center;font-size:clamp(16px,1.45vw,19px);font-weight:750;line-height:1.1;letter-spacing:-.02em;text-shadow:0 2px 10px rgba(0,0,0,.35)}
        .gc-v3-marquee-body p{margin:3px 0 11px;font-size:18px;font-weight:800;line-height:1.05;letter-spacing:-.01em;color:#ffc19f}
        .gc-v3-marquee-criteria{width:100%;margin-top:auto;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:750;color:#ffe2cd;flex-wrap:wrap}
        .gc-v3-marquee-criteria span{padding:6px 10px;border:1px solid rgba(255,193,159,.34);border-radius:999px;background:rgba(255,193,159,.17);line-height:1}
        .gc-v3-marquee-criteria i{display:none}
        @media(max-width:640px){
          .gc-v3-marquee-card{--gc-card-panel:140px;height:min(52vh,480px);margin-top:calc(min(52vh,480px) / -2);margin-left:calc(min(52vh,480px) * 0.4 * -1);border-radius:22px}
          .gc-v3-marquee-body{padding:14px 10px 11px}.gc-v3-marquee-body strong{min-height:36px;font-size:15.5px}.gc-v3-marquee-body p{font-size:16px;margin-bottom:8px}.gc-v3-marquee-criteria{gap:5px;font-size:11.5px}.gc-v3-marquee-criteria span{padding:5px 8px}
          .gc-v3-marquee{perspective:900px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
        }
        .gc-v2-node{position:absolute;z-index:3;width:48px;height:48px;display:grid;place-items:center;border-radius:16px;background:#294b59;border:1px solid rgba(255,255,255,.17);box-shadow:0 10px 24px rgba(3,18,27,.28);opacity:.38;transform:scale(.86);transition:.42s cubic-bezier(.2,.8,.2,1)}.gc-v2-node[data-active=true]{opacity:1;transform:scale(1);background:linear-gradient(145deg,#ffc19f,#ef735f);color:#17303e;box-shadow:0 0 0 7px rgba(239,115,95,.12),0 12px 28px rgba(3,18,27,.34)}.gc-v2-node-1{left:4.5%;top:144px}.gc-v2-node-2{left:67%;top:98px}.gc-v2-node-3{right:2%;top:82px}
        .gc-v2-step{position:absolute;z-index:2;width:29%;padding:16px 17px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(15,39,51,.65);box-shadow:0 16px 38px rgba(4,20,29,.22);backdrop-filter:blur(9px);opacity:.18;transform:translateY(12px);transition:.52s cubic-bezier(.2,.8,.2,1)}.gc-v2-step[data-visible=true]{opacity:1;transform:none}.gc-v2-step small{color:#ef735f;font-size:9px;font-weight:800;letter-spacing:.18em}.gc-v2-step h2{margin:5px 0 5px;color:#fff4e8;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(18px,1.7vw,24px);font-weight:700;line-height:1.05;letter-spacing:-.03em}.gc-v2-step p{margin:0;color:#b9ccca;font-size:12px;line-height:1.35}.gc-v2-step-1{left:0;bottom:8px}.gc-v2-step-2{left:35.5%;bottom:8px}.gc-v2-step-3{right:0;bottom:8px}
        .gc-v2-example{margin-top:12px;padding:9px 10px;border-left:2px solid #ef735f;background:rgba(255,255,255,.05);color:#f1ddd1;font-size:10.5px;line-height:1.35}.gc-v2-signals{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.gc-v2-signals span{padding:5px 7px;border-radius:999px;background:rgba(255,193,159,.12);border:1px solid rgba(255,193,159,.2);color:#ffd3bb;font-size:9px;font-weight:700}.gc-v2-products{display:flex;gap:6px;margin-top:10px}.gc-v2-products span{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:#fff4e8;box-shadow:0 5px 14px rgba(0,0,0,.18);font-size:16px}
        .gc-v2-legal{position:absolute;z-index:6;left:50%;bottom:145px;transform:translateX(-50%);display:flex;align-items:center;gap:7px;white-space:nowrap;color:#9db3b1;font-size:11px}.gc-v2-legal a,.gc-v2-legal>button:not(.gc-v2-info){padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}.gc-v2-info{width:23px;height:23px;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(9,29,40,.32);color:#ffc19f;font-weight:800;cursor:pointer}.gc-v2-disclaimer{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);width:270px;white-space:normal;padding:12px 13px;border-radius:14px;background:#fff8ef;color:#203746;box-shadow:0 18px 40px rgba(0,0,0,.3);font-size:11px;line-height:1.45;text-align:left}.gc-v2-disclaimer>button{position:absolute;z-index:2;right:6px;top:5px;width:22px;height:22px;display:grid;place-items:center;padding:0;line-height:1;border:0;border-radius:50%;background:none;color:#5d7480;font-size:16px;font-weight:600;cursor:pointer}.gc-v2-disclaimer>button:hover{background:rgba(32,55,70,.08);color:#203746}.gc-v2-disclaimer span{display:block}.gc-v2-disclaimer span:first-of-type{padding-right:22px}.gc-v2-disclaimer span+span{margin-top:7px}
        .gc-landing-sheet{background:#edf0ea!important}.gc-landing-sheet-field{border-color:#b8cbc7;background:#fffaf4}.gc-landing-sheet-field:focus-within{border-color:#ef735f;box-shadow:0 0 0 3px rgba(239,115,95,.14)}.gc-landing-sheet-field label{color:#203746}.gc-landing-sheet-handle{background:#9eb4b0}
        .gc-landing-sheet .gc-start-bar{border-color:#ef735f!important;box-shadow:0 0 0 5px rgba(239,115,95,.17),0 12px 28px rgba(15,39,51,.25)!important}.gc-landing-sheet .gc-start-bar>span{background:linear-gradient(145deg,#294b59,#203746)!important}.gc-landing-sheet button:not(.gc-landing-sheet-handle){border-color:#b8cbc7!important}.gc-landing-sheet input[type=range]::-webkit-slider-thumb{background:#ef735f}
        .gc-flow-header strong{color:#fff4e8!important}.gc-flow-header small{color:#c3d2cf!important}.gc-flow-header>div:first-child>div button,.gc-flow-header>div:first-child>button+div button{border-color:rgba(255,244,232,.22)!important;background:rgba(9,29,40,.28)!important;color:#fff4e8!important}.gc-flow-header>div:last-child{background:rgba(255,255,255,.14)!important}.gc-flow-header>div:last-child>div{background:linear-gradient(90deg,#ffc19f,#ef735f)!important}
        .gc-main section[style*="max-width: 430px"]{border-radius:0}.gc-main section[style*="max-width: 430px"] textarea:focus,.gc-main section[style*="max-width: 430px"] input:focus{border-color:#ef735f!important}
        @media(max-width:900px){.gc-landing{min-height:calc(100dvh + 650px)!important}.gc-landing-v2{min-height:560px;padding:calc(13px + env(safe-area-inset-top)) 18px calc(132px + env(safe-area-inset-bottom))}.gc-v2-logo{width:39px;height:39px;border-radius:12px}.gc-v2-wordmark strong{font-size:25px}.gc-v2-wordmark small{font-size:7px}.gc-v2-pill{height:34px;padding:0 9px}.gc-v2-layout{height:calc(100% - 50px);display:flex;flex-direction:column;gap:0;align-items:stretch}.gc-v2-hero{text-align:center;padding:18px 0 0}.gc-v2-eyebrow{font-size:8px;margin-bottom:10px}.gc-v2-hero h1{font-size:clamp(34px,9.8vw,43px);line-height:.98}.gc-v2-hero h1 em{margin-top:5px}.gc-v2-benefits{justify-content:center;margin-top:14px;font-size:11px}.gc-v2-scroll-cue{justify-content:center;margin-top:12px;font-size:9.5px}.gc-v2-story{width:100%;height:245px;margin-top:4px}.gc-v2-route{top:-4px;height:132px}.gc-v2-node{width:38px;height:38px;border-radius:12px}.gc-v2-node-1{left:3%;top:74px}.gc-v2-node-2{left:65%;top:46px}.gc-v2-node-3{right:0;top:34px}.gc-v2-step{left:0!important;right:0!important;bottom:0!important;width:auto;min-height:102px;padding:13px 15px;opacity:0!important;transform:translateY(9px) scale(.98)!important;pointer-events:none}.gc-v2-step[data-current=true]{opacity:1!important;transform:none!important;pointer-events:auto}.gc-v2-step h2{font-size:20px}.gc-v2-step p{font-size:11px}.gc-v2-example{margin-top:8px}.gc-v2-signals{margin-top:8px}.gc-v2-products{margin-top:7px}.gc-v2-legal{bottom:104px;font-size:10.5px}.gc-v2-scroll-cue b{width:21px;height:21px}}
        @media(max-width:900px){.gc-v2-legal{bottom:142px}.gc-v2-brand{gap:8px;padding:4px 9px 4px 5px;border-radius:16px}.gc-v2-wordmark small{font-size:6.5px}.gc-v2-pill{height:39px;min-width:39px;padding:0 10px}}
        @media(min-width:901px){.gc-main.gc-main--flush{padding:0!important}.gc-landing{display:block!important;min-height:calc(100vh + 900px)!important}.gc-landing-v2{min-height:680px;padding-bottom:122px}.gc-landing-sheet{left:50%!important;right:auto!important;bottom:24px!important;width:min(720px,calc(100vw - 64px));transform:translateX(-50%);border-radius:24px!important}.gc-main section[style*="max-width: 430px"]{max-width:620px!important}
          .gc-v2-story{display:none}
        }
        /* ── Mobile-landing 3-step animation (design handoff) ── */
        @keyframes gcStageCycle {
          0%, 30% { opacity:1; transform:scale(1) translateY(0); filter:blur(0); }
          33.3%, 96%, 100% { opacity:0; transform:scale(.85) translateY(-6px); filter:blur(4px); }
        }
        @keyframes gcDotActive {
          0%, 33.3% { background:#e3c089; box-shadow:0 0 0 5px rgba(227,192,137,.3); transform:scale(1.15); }
          33.4%, 100% { background:rgba(255,255,255,.25); box-shadow:none; transform:scale(1); }
        }
        @keyframes gcLineFill { 0%,33.3%{transform:scaleX(0)} 96%,100%{transform:scaleX(1)} }
        @keyframes gcTypingDot { 0%,60%,100%{transform:translateY(0);opacity:.45} 30%{transform:translateY(-3px);opacity:1} }
        @keyframes gcProfileIn { 0%,12%{opacity:0;transform:translateX(-10px) scale(.92)} 35%,100%{opacity:1;transform:none} }
        @keyframes gcBubbleIn { 0%,25%{opacity:0;transform:translate(8px,5px) scale(.88)} 48%,100%{opacity:1;transform:none} }
        @keyframes gcChipPop { 0%,35%{opacity:0;transform:scale(.4)} 55%{opacity:1;transform:scale(1.14)} 70%,100%{opacity:1;transform:scale(1)} }
        @keyframes gcAura { 0%,100%{opacity:.35;transform:scale(.86)} 50%{opacity:.75;transform:scale(1.08)} }
        @keyframes gcOrbitSlow { to{transform:rotate(360deg)} }
        @keyframes gcCorePulse { 0%,100%{filter:drop-shadow(0 0 2px rgba(240,217,168,.25));transform:scale(.94)} 50%{filter:drop-shadow(0 0 9px rgba(240,217,168,.75));transform:scale(1.04)} }
        @keyframes gcSparkTwinkle { 0%,100%{opacity:.25;transform:scale(.55) rotate(0)} 50%{opacity:1;transform:scale(1.18) rotate(90deg)} }
        @keyframes gcSignalTravel { 0%{stroke-dashoffset:52;opacity:.3} 55%{opacity:1} 100%{stroke-dashoffset:0;opacity:.3} }
        @keyframes gcLidOpen { 0%,18%{transform:translateY(0) rotate(0)} 52%,82%{transform:translateY(-9px) rotate(-7deg)} 100%{transform:translateY(0) rotate(0)} }
        @keyframes gcGiftRise { 0%,18%{transform:translateY(7px) scale(.92)} 55%,82%{transform:translateY(0) scale(1.04)} 100%{transform:translateY(7px) scale(.92)} }
        @keyframes gcConfetti { 0%,25%{opacity:0;transform:translateY(8px) scale(.3) rotate(0)} 55%{opacity:1;transform:translateY(-7px) scale(1) rotate(150deg)} 85%,100%{opacity:0;transform:translateY(-13px) scale(.7) rotate(260deg)} }
        @keyframes gcHeartRise { 0%,28%{opacity:0;transform:translateY(7px) scale(.5)} 55%,78%{opacity:1;transform:translateY(-6px) scale(1)} 100%{opacity:0;transform:translateY(-12px) scale(.8)} }
        @keyframes gcScanSweep { 0%,18%{opacity:0;transform:translateY(-24px)} 35%{opacity:.9} 75%{opacity:.65} 100%{opacity:0;transform:translateY(35px)} }
        @keyframes gcCardReveal { 0%,18%{opacity:0;transform:translateY(13px) scale(.88)} 48%,82%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-5px) scale(.96)} }
        @keyframes gcFacetGlow { 0%,100%{opacity:.55;filter:brightness(.9)} 50%{opacity:1;filter:brightness(1.25)} }
        .gc-stage-scene { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; animation:gcStageCycle 9s ease-in-out infinite; }
        .gc-stage-typing-dot { animation:gcTypingDot 1.2s ease-in-out infinite; }
        .gc-stage-profile { transform-origin:center; animation:gcProfileIn 1.35s ease-out both; }
        .gc-stage-bubble { transform-origin:center; animation:gcBubbleIn 1.45s ease-out both; }
        .gc-stage-chip { transform-origin:center; animation:gcChipPop 1.5s ease-out both; }
        .gc-stage-aura { transform-origin:center; animation:gcAura 1.8s ease-in-out infinite; }
        .gc-stage-orbit { transform-origin:55px 38px; animation:gcOrbitSlow 5.5s linear infinite; }
        .gc-stage-core { transform-origin:center; animation:gcCorePulse 1.7s ease-in-out infinite; }
        .gc-stage-spark { transform-origin:center; animation:gcSparkTwinkle 1.4s ease-in-out infinite; }
        .gc-stage-signal { animation:gcSignalTravel 1.6s linear infinite; }
        .gc-stage-gift { transform-origin:center; animation:gcGiftRise 2.7s ease-in-out infinite; }
        .gc-stage-lid { transform-origin:55px 31px; animation:gcLidOpen 2.7s ease-in-out infinite; }
        .gc-stage-confetti { transform-origin:center; animation:gcConfetti 2.7s ease-out infinite; }
        .gc-stage-heart { transform-origin:center; animation:gcHeartRise 2.7s ease-out infinite; }
        .gc-stage-scan { animation:gcScanSweep 2.6s ease-in-out infinite; }
        .gc-stage-card-reveal { transform-origin:center; animation:gcCardReveal 2.7s ease-out infinite; }
        .gc-stage-facet { animation:gcFacetGlow 1.7s ease-in-out infinite; }
        .gc-stage-dot { width:9px; height:9px; border-radius:50%; background:rgba(255,255,255,.25); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); animation:gcDotActive 9s steps(1,end) infinite; }
        .gc-stage-line-fill { height:100%; width:100%; background:#e3c089; transform:scaleX(0); animation:gcLineFill 3s linear infinite; }
        .gc-fade  {animation:gcfade .4s ease both}
        .gc-orbit {animation:gcorbit 2.4s linear infinite}
        .gc-bob   {animation:gcbob 2s ease-in-out infinite}
        .gc-p1    {animation:gcpulse 1.2s ease-in-out infinite}
        .gc-p2    {animation:gcpulse 1.2s ease-in-out .2s infinite}
        .gc-p3    {animation:gcpulse 1.2s ease-in-out .4s infinite}
        .gc-mobile-textarea::placeholder{color:#9a9698;opacity:1}
        .gc-flow-clues{gap:0}.gc-clue-chat-heading>span{display:block;margin-bottom:7px;color:#d85e4e;font:850 8px 'Hanken Grotesk',sans-serif;letter-spacing:.17em}.gc-clue-chat-thread{flex:1;min-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:12px 1px 14px;scrollbar-width:thin}.gc-clue-message{display:flex;align-items:flex-start;gap:8px;max-width:88%;animation:gcfade .25s ease both}.gc-clue-message--user{align-self:flex-end;flex-direction:row-reverse}.gc-clue-message-avatar{width:28px;height:28px;flex:0 0 auto;display:grid;place-items:center;border-radius:9px;background:linear-gradient(145deg,#ffc19f,#ef735f);box-shadow:0 5px 12px rgba(239,115,95,.16)}.gc-clue-message>div{padding:9px 11px;border:1px solid #dec8b1;border-radius:5px 15px 15px 15px;background:#fffaf4;box-shadow:0 5px 16px rgba(56,34,28,.05)}.gc-clue-message--user>div{border-color:#efaa98;border-radius:15px 5px 15px 15px;background:#f5d9cf}.gc-clue-message small{display:block;margin-bottom:3px;color:#a45e5b;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.gc-clue-message p{margin:0;color:#17303e;font-size:12px;line-height:1.45}.gc-clue-typing{display:flex!important;gap:4px;padding:4px 1px}.gc-clue-typing i{width:5px;height:5px;border-radius:50%;background:#ef735f;animation:gcpulse 1s ease-in-out infinite}.gc-clue-typing i:nth-child(2){animation-delay:.16s}.gc-clue-typing i:nth-child(3){animation-delay:.32s}.gc-clue-quick-replies{display:flex;gap:6px;overflow-x:auto;padding:0 0 9px;scrollbar-width:none}.gc-clue-quick-replies button{flex:0 0 auto;padding:7px 11px;border:1px solid #d8b991;border-radius:999px;background:#fff8ef;color:#8f4d48;font:700 10.5px 'Hanken Grotesk',sans-serif;cursor:pointer}.gc-clue-composer{flex:0 0 auto;margin-top:auto}.gc-clue-composer textarea{min-height:84px;padding:14px 88px 14px 14px;border:1.5px solid #d5a16c;border-radius:19px;background:#fffdf9;font-size:16px;line-height:1.4;box-shadow:0 8px 24px rgba(91,45,39,.08)}.gc-clue-composer textarea::placeholder{color:#9a989c;opacity:1}.gc-clue-composer-actions{position:absolute;right:9px;bottom:9px;display:flex;align-items:center;gap:6px}.gc-clue-composer-actions button{width:34px;height:34px;padding:0;display:grid;place-items:center;border-radius:50%;cursor:pointer}.gc-clue-composer-actions .gc-voice-button{border:1px solid #ddc2a5;background:#f5e8d8;color:#a1534e}.gc-clue-composer-actions .gc-voice-button--active{border-color:#a1534e;background:#a1534e;color:#fff}.gc-clue-send{border:0;background:#ef735f;color:#17303e;font-size:20px;font-weight:800}.gc-clue-send:disabled{background:#d8c7b6;color:#978b80;cursor:not-allowed}.gc-clue-voice-status{padding-top:6px;color:#963f3d;font-size:10px}.gc-loading-visual{transform:scale(1.1);transform-origin:center}.gc-loading-title{max-width:380px!important}
        .gc-loader-turn{animation:gcLoaderTurn 7s linear infinite}
        .gc-loader-counter{animation:gcLoaderCounterTurn 7s linear infinite}
        .gc-loader-glow{animation:gcLoaderGlow 2.2s ease-in-out infinite}
        .gc-loader-card{animation:gcLoaderCard 2.4s ease-in-out infinite}
        .gc-loader-sweep{animation:gcLoaderSweep 3.8s linear infinite}
        .gc-loader-core{animation:gcLoaderCore 2.8s cubic-bezier(.4,0,.2,1) infinite}
        .gc-loader-node{animation:gcLoaderNode 2.5s ease-in-out infinite}
        .gc-loader-scan{animation:gcLoaderScan 2.8s ease-in-out infinite}
        .gc-loader-spark{animation:gcLoaderSpark 2.8s ease-in-out infinite}
        .gc-voice-button--active{animation:gcVoicePulse 1.25s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.gc-stage-scene,.gc-stage-typing-dot,.gc-stage-profile,.gc-stage-bubble,.gc-stage-chip,.gc-stage-aura,.gc-stage-orbit,.gc-stage-core,.gc-stage-spark,.gc-stage-signal,.gc-stage-gift,.gc-stage-lid,.gc-stage-confetti,.gc-stage-heart,.gc-stage-scan,.gc-stage-card-reveal,.gc-stage-facet,.gc-stage-dot,.gc-stage-line-fill,.gc-bar-pulse,.gc-start-bar:after,.gc-start-cue,.gc-loader-turn,.gc-loader-counter,.gc-loader-glow,.gc-loader-card,.gc-loader-sweep,.gc-loader-core,.gc-loader-node,.gc-loader-scan,.gc-loader-spark,.gc-voice-button--active{animation:none!important}.gc-stage-scene{opacity:0!important}.gc-stage-scene:first-child{opacity:1!important}}
        input[type=range]{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;outline:none;cursor:pointer}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#7c3f3f;border:3px solid #fff;box-shadow:0 2px 8px rgba(124,63,63,.4);cursor:pointer}
        textarea:focus,input:focus{outline:none;border-color:#7c3f3f!important}
        ::selection{background:#c9a26b;color:#fff}
        .gc-tip{position:relative;display:inline-flex}
        .gc-tip-box{position:absolute;bottom:42px;right:0;width:250px;background:#fff;border:1px solid #ece0d2;border-radius:12px;padding:12px 14px;text-align:left;font:400 11.5px 'Hanken Grotesk',sans-serif;line-height:1.5;color:#3a2e26;box-shadow:0 8px 28px rgba(124,63,63,.18);opacity:0;pointer-events:none;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease;z-index:1001}
        .gc-tip-box::after{content:"";position:absolute;bottom:-6px;right:13px;width:11px;height:11px;background:#fff;border-right:1px solid #ece0d2;border-bottom:1px solid #ece0d2;transform:rotate(45deg)}
        .gc-tip:hover .gc-tip-box{opacity:1;transform:translateY(0)}
        .gc-tip-badge{width:30px;height:30px;border-radius:50%;border:1.5px solid #d8c4b0;background:#fff;color:#7c3f3f;font-size:14px;cursor:default;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(124,63,63,.12);transition:border-color .15s,box-shadow .15s}
        .gc-tip:hover .gc-tip-badge{border-color:#7c3f3f;box-shadow:0 4px 14px rgba(124,63,63,.22)}
        /* Shorter laptop windows (not phones — those use the width query
           below): tighten vertical spacing so the Continue button fits on
           screen without needing a sticky bar or scrolling. */
        @media(min-width:901px) and (max-height:820px){
          .gc-main{padding-top:22px!important;padding-bottom:26px!important}
          .gc-progress{margin-bottom:16px!important}
          .gc-bubble{margin-bottom:14px!important}
          .gc-intake-nav{margin-top:16px!important;padding-top:14px!important}
        }
        .gc-desktop-rail,.gc-desktop-results-grid,.gc-desktop-favorites,.gc-desktop-kicker{display:none}
        @media(min-width:901px){
          .gc-shell:has(.gc-flow-screen){background:#f5e9dc!important}
          .gc-brand{width:390px!important;max-width:390px!important;padding:0!important;background:radial-gradient(circle at 16% 12%,rgba(239,115,95,.17),transparent 28%),linear-gradient(180deg,#102a36,#173846 58%,#102a36)!important}
          .gc-brand>:not(.gc-desktop-rail){display:none!important}
          .gc-desktop-rail{position:relative;z-index:3;height:100%;box-sizing:border-box;padding:32px 30px 26px;display:flex;flex-direction:column}
          .gc-desktop-rail:before{content:"";position:absolute;left:57px;top:344px;height:216px;width:1px;background:linear-gradient(180deg,rgba(239,115,95,.72),rgba(126,214,203,.5),rgba(255,195,111,.28));box-shadow:0 0 18px rgba(126,214,203,.2)}
          .gc-desktop-rail-brand{display:flex;align-items:center;gap:12px;padding:0;border:0;background:transparent;color:#fff4e8;cursor:pointer}.gc-desktop-rail-brand>span{width:50px;height:50px;display:grid;place-items:center;border-radius:15px;background:linear-gradient(145deg,#ffc19f,#ef735f);box-shadow:0 12px 30px rgba(239,115,95,.2)}.gc-desktop-rail-brand>strong{font:800 29px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.045em}
          .gc-desktop-rail-context{margin:52px 0 58px;padding:24px;border:1px solid rgba(255,244,232,.12);border-radius:21px;background:rgba(255,244,232,.055);box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}.gc-desktop-rail-context small{color:#ef8a78;font:850 9px 'Hanken Grotesk',sans-serif;letter-spacing:.18em}.gc-desktop-rail-context h2{margin:9px 0 5px;color:#fff4e8;font:700 31px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.035em}.gc-desktop-rail-context p{margin:0;color:#b8ccca;font-size:13px}
          .gc-desktop-rail-steps{position:relative;display:grid;gap:32px}.gc-desktop-rail-steps>div{position:relative;z-index:1;display:flex;align-items:center;gap:17px;color:#6f8c91}.gc-desktop-rail-steps i{width:52px;height:52px;display:grid;place-items:center;flex:0 0 auto;border:1px solid rgba(255,255,255,.14);border-radius:50%;background:#14313e;color:inherit;font:800 11px 'Hanken Grotesk',sans-serif;font-style:normal;letter-spacing:.05em}.gc-desktop-rail-steps span small{display:block;margin-bottom:3px;font:800 8px 'Hanken Grotesk',sans-serif;letter-spacing:.17em}.gc-desktop-rail-steps span strong{display:block;color:inherit;font:700 17px 'Hanken Grotesk',sans-serif}.gc-desktop-rail-steps>div[data-done=true]{color:#98b9b5}.gc-desktop-rail-steps>div[data-active=true]{color:#fff4e8}.gc-desktop-rail-steps>div[data-active=true] i{border-color:#7ed6cb;background:rgba(126,214,203,.16);color:#7ed6cb;box-shadow:0 0 0 7px rgba(126,214,203,.06),0 0 24px rgba(126,214,203,.24)}.gc-desktop-rail-steps>div[data-active=true] span small{color:#7ed6cb}
          .gc-desktop-rail-foot{position:relative;margin-top:auto;display:flex;align-items:center;flex-wrap:wrap;gap:8px 11px;color:#7f9b9e;font-size:9.5px}.gc-desktop-rail-foot>span{width:100%;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.08);color:#b8ccca}.gc-desktop-rail-foot a,.gc-desktop-rail-foot button{padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}.gc-desktop-rail-foot .gc-v2-info{width:24px;height:24px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.22);border-radius:50%;background:rgba(255,255,255,.05);color:#ffc19f;text-decoration:none}.gc-desktop-rail-foot .gc-v2-disclaimer{left:0;bottom:34px;transform:none;width:285px}
          .gc-main:not(.gc-main--flush){padding:42px 52px 54px!important;background:radial-gradient(circle at 88% 4%,rgba(239,115,95,.09),transparent 26%),#f5e9dc!important}
          .gc-topnav{min-height:44px;margin-bottom:14px!important}.gc-topnav>div>button{border-color:rgba(255,244,232,.2)!important;background:rgba(255,244,232,.07)!important;color:#fff4e8!important}.gc-desktop-favorites{height:38px;padding:0 13px;border:1px solid rgba(255,244,232,.2);border-radius:999px;background:rgba(255,244,232,.07);display:flex;align-items:center;gap:7px;color:#fff4e8;font:750 12px 'Hanken Grotesk',sans-serif;cursor:pointer}.gc-desktop-favorites>span{color:#ffc19f;font-size:18px}.gc-desktop-favorites>b{min-width:18px;height:18px;display:grid;place-items:center;border-radius:99px;background:#ef735f;color:#17303e;font-size:9px}
          .gc-main[class*="gc-main--"] section.gc-flow-screen{width:100%!important;max-width:1320px!important;min-height:calc(100vh - 96px)!important;height:auto!important;box-sizing:border-box;margin:0 auto!important;padding:18px 10px 48px!important;border:0;border-radius:0;background:transparent!important;box-shadow:none;overflow:visible!important}
          .gc-flow-header{margin:-34px -38px 30px!important;padding:18px 24px 15px!important;border-radius:30px 30px 0 0;box-shadow:none!important}.gc-flow-header>div:first-child{margin-bottom:13px!important}
          .gc-flow-screen .gc-flow-title,.gc-flow-results>h1{margin:0 0 12px!important;color:#17303e!important;font:650 clamp(42px,4vw,58px)/.98 'Bricolage Grotesque',sans-serif!important;letter-spacing:-.055em!important}.gc-flow-screen .gc-flow-lede{max-width:480px;margin:0!important;color:#5f777c!important;font-size:16px!important;line-height:1.55!important}
          .gc-flow-clues{display:flex!important;flex-direction:column!important;max-width:980px!important;padding-top:8px!important;padding-bottom:10px!important;overflow:hidden!important}.gc-clue-chat-heading{width:100%;max-width:900px;margin:0 auto}.gc-clue-chat-heading .gc-flow-lede{max-width:650px!important}.gc-clue-chat-thread{width:100%;max-width:900px;min-height:250px;margin:12px auto 8px;padding:16px 4px}.gc-clue-message{max-width:72%}.gc-clue-message-avatar{width:34px;height:34px;border-radius:11px}.gc-clue-message>div{padding:12px 15px}.gc-clue-message p{font-size:14px}.gc-clue-quick-replies{width:100%;max-width:900px;margin:0 auto}.gc-clue-quick-replies button{padding:9px 14px;font-size:12px}.gc-flow-clues .gc-clue-composer{width:100%;max-width:900px;margin:auto auto 0;min-width:0;transform:translateY(12px)}.gc-flow-clues .gc-clue-composer textarea{min-height:112px!important;padding:20px 112px 20px 22px!important;border:1.5px solid rgba(239,115,95,.58)!important;border-radius:27px!important;background:#fffaf4!important;font-size:17px!important;box-shadow:0 18px 40px rgba(57,31,27,.09)!important}.gc-flow-clues .gc-clue-composer-actions{right:15px;bottom:15px}.gc-flow-clues .gc-clue-composer-actions button{width:42px;height:42px}.gc-flow-clues .gc-clue-voice-status{width:100%;max-width:900px;margin:0 auto;padding-top:8px!important}.gc-flow-primary-action>button{min-height:58px!important;border-radius:15px!important;background:linear-gradient(145deg,#ef735f,#d85e4e)!important;box-shadow:0 12px 28px rgba(216,94,78,.22)!important;font-size:15px!important}
          .gc-flow-signals .gc-signals-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px!important;margin-top:26px}.gc-flow-signals .gc-signals-grid>div{min-height:76px!important;padding:12px 14px!important;border-color:#d8c4b0!important;border-radius:16px!important;box-shadow:0 8px 20px rgba(40,29,25,.05)}.gc-flow-signals .gc-flow-primary-action{width:380px;margin:26px 0 0 auto!important}
          .gc-flow-loading>div:last-child{min-height:560px}.gc-flow-loading .gc-loader-core{background:linear-gradient(145deg,#2b6871,#17303e)!important}.gc-flow-loading .gc-loading-visual{transform:scale(1.38);margin-bottom:64px!important}.gc-flow-loading .gc-loading-title{max-width:900px!important;font-size:43px!important;line-height:1.02!important;color:#17303e!important}
          .gc-main .gc-flow-results{max-width:1400px!important;min-height:100%!important}.gc-flow-results>h1{font-size:50px!important}.gc-mobile-kicker{display:none}.gc-desktop-kicker{display:inline}.gc-mobile-result-deck{display:none}.gc-desktop-results-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:24px;padding-bottom:28px}
          .gc-desktop-result-card{min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.11);border-radius:22px;background:#102b38;box-shadow:0 18px 40px rgba(7,28,36,.18);transition:transform .22s ease,box-shadow .22s ease}.gc-desktop-result-card:hover{transform:translateY(-5px);box-shadow:0 24px 52px rgba(7,28,36,.26)}.gc-desktop-result-photo{position:relative;height:205px;overflow:hidden}.gc-desktop-result-photo:after{content:"";position:absolute;inset:45% 0 0;background:linear-gradient(transparent,#102b38)}.gc-desktop-result-photo img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .5s ease}.gc-desktop-result-card:hover .gc-desktop-result-photo img{transform:scale(1.035)}.gc-desktop-result-photo>span{position:absolute;z-index:2;left:13px;top:13px;padding:5px 9px;border:1px solid rgba(255,255,255,.25);border-radius:99px;background:rgba(10,31,41,.56);backdrop-filter:blur(6px);color:#fff4e8;font-size:8px;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.gc-desktop-result-photo>button{position:absolute;z-index:3;right:12px;top:12px;width:36px;height:36px;border:1px solid rgba(255,255,255,.36);border-radius:50%;background:rgba(10,31,41,.56);backdrop-filter:blur(6px);color:#ffc19f;font-size:20px;cursor:pointer}.gc-desktop-result-body{padding:4px 17px 17px;color:#fff4e8}.gc-desktop-result-body>small{color:#7ed6cb;font-size:8px;font-weight:850;letter-spacing:.16em}.gc-desktop-result-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin:7px 0}.gc-desktop-result-title h2{margin:0;color:#fff4e8;font:700 19px/1.08 'Bricolage Grotesque',sans-serif;letter-spacing:-.035em}.gc-desktop-result-title strong{flex:0 0 auto;color:#ffc19f;font:700 16px 'Bricolage Grotesque',sans-serif}.gc-desktop-result-body>p{height:53px;margin:0 0 14px;overflow:hidden;color:#b8ccca;font-size:11.5px;line-height:1.5}.gc-desktop-result-actions{display:grid;grid-template-columns:1.15fr .85fr;gap:7px}.gc-desktop-result-actions a,.gc-desktop-result-actions button{min-height:40px;box-sizing:border-box;display:grid;place-items:center;padding:8px;border-radius:10px;font:750 10.5px 'Hanken Grotesk',sans-serif;text-align:center;text-decoration:none;cursor:pointer}.gc-desktop-result-actions a{border:0;background:#ef735f;color:#102a36}.gc-desktop-result-actions button{border:1px solid rgba(255,244,232,.25);background:rgba(255,244,232,.07);color:#fff4e8}.gc-desktop-discard{width:100%;margin-top:7px;padding:4px;border:0;background:transparent;color:#789499;font-size:9.5px;cursor:pointer}
          .gc-main .gc-flow-refine{max-width:930px!important}.gc-flow-refine textarea{min-height:200px!important;padding:18px!important;border-radius:18px!important}.gc-main .gc-flow-favorites,.gc-main .gc-flow-favorite-detail{max-width:940px!important}
        }
        @media(min-width:901px) and (max-width:1400px){.gc-brand{width:350px!important;max-width:350px!important}.gc-main:not(.gc-main--flush){padding-left:34px!important;padding-right:34px!important}.gc-desktop-results-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
        @media(max-width:900px){.gc-brand{display:none!important}.gc-main{padding:24px 20px 40px!important}.gc-grid{grid-template-columns:1fr!important}
          input:not([type=range]),textarea,select{font-size:16px!important}
          .gc-mobile-header{display:flex!important}
          .gc-topnav{flex-wrap:nowrap!important}
          .gc-topnav nav{flex:1 1 auto;min-width:0;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;justify-content:flex-start!important}
          .gc-topnav nav::-webkit-scrollbar{display:none}
          .gc-topnav button{white-space:nowrap}
          .gc-topnav > div{flex-shrink:0}
          .gc-main.gc-main--flush{padding:0!important}
          /* Use the dynamic viewport height on mobile, not 100vh — 100vh is
             measured against the tallest possible viewport (browser chrome
             collapsed), so on load (chrome expanded, address/toolbar bars
             visible) fixed-height/100vh content overflows further than what's
             actually visible, and top content ends up starting underneath
             the browser's own top bar. 100dvh tracks the real visible area. */
          .gc-shell,.gc-main{height:100dvh!important}
        }
        /* Defensive: the mobile landing screen state ("landing") is only ever
           reachable below 900px (see the screen useState initializer), but
           hide it by CSS too in case it's ever forced above that width. */
        @media(min-width:901px){.gc-landing{display:block!important}}

        /* Real scroll journey: every phase occupies physical page space. */
        .gc-main.gc-main--flush{scroll-snap-type:y mandatory;scroll-padding-top:0;scroll-behavior:smooth}
        .gc-landing{min-height:0!important;background:#17303e!important}
        .gc-landing-v2{position:relative!important;top:auto!important;height:auto!important;min-height:100dvh!important;overflow:visible!important;padding:0!important;background:linear-gradient(180deg,#17303e 0%,#203746 48%,#294b59 100%)!important}
        .gc-landing-v2-header{position:sticky!important;top:0;z-index:80;isolation:isolate;box-sizing:border-box;max-width:none!important;height:82px;padding:15px clamp(18px,4vw,56px) 8px;background:transparent;backdrop-filter:none}
        .gc-landing-v2-header:before{content:"";position:absolute;z-index:-1;left:0;right:0;top:0;height:122px;pointer-events:none;background:linear-gradient(180deg,#152b38 0%,rgba(21,43,56,.94) 34%,rgba(21,43,56,.64) 62%,rgba(21,43,56,.22) 82%,rgba(21,43,56,0) 100%)}
        .gc-v3-journey{position:relative;margin-top:-82px;color:#fff4e8;background:radial-gradient(circle at 15% 18%,rgba(239,115,95,.1),transparent 20%),linear-gradient(180deg,#17303e,#203746 38%,#274956 72%,#17303e)}
        /* Column, not a centred grid: the headline and the scroll cue take
           only the height they need and the carousel claims everything left
           over, so the cards run the full height of the screen instead of
           sitting in a band in the middle. */
        .gc-v3-hero{position:relative;height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:78px 0 22px;box-sizing:border-box;overflow:hidden;text-align:center;scroll-snap-align:start;scroll-snap-stop:always}
        .gc-v3-hero-glow{position:absolute;top:34%;width:min(70vw,720px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(239,115,95,.2),rgba(255,193,159,.05) 42%,transparent 70%);filter:blur(4px);animation:gcLoaderGlow 4s ease-in-out infinite}
        .gc-v3-hero-copy{position:relative;z-index:2;flex:0 0 auto;padding:0 24px}.gc-v3-hero h1{max-width:900px;margin:0;color:#fff4e8;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(30px,4.2vw,58px);font-weight:650;line-height:1.03;letter-spacing:-.05em}.gc-v3-hero h1 em{display:inline-block;margin-top:4px;color:#ef735f;font-family:Georgia,serif;font-weight:400;letter-spacing:-.04em}
        .gc-v3-hero .gc-v2-benefits{justify-content:center;gap:13px;margin-top:17px}
        .gc-v3-hero .gc-v2-benefits span{display:flex;align-items:center;gap:7px;padding:0;color:#fff4e8;font-size:12.5px;font-weight:800;letter-spacing:.01em}
        .gc-v3-hero .gc-v2-benefits span:before{content:"";width:5px;height:5px;flex:0 0 auto;border-radius:1px;background:#ef735f;box-shadow:0 0 10px rgba(239,115,95,.55);transform:rotate(45deg)}
        .gc-v3-hero .gc-v2-benefits i{width:18px;height:1px;border-radius:0;background:linear-gradient(90deg,rgba(255,193,159,.12),rgba(255,193,159,.6),rgba(255,193,159,.12))}
        /* Hero scroll cue: label + chevron, no container. The white bubble it
           replaces sat on top of the artwork like a tooltip; this reads as
           part of the page and the whole unit bobs as one. */
        .gc-v3-scroll-cue{position:relative;z-index:5;flex:0 0 auto;margin-top:18px;padding:6px 12px;border:0;border-radius:0;background:none;box-shadow:none;display:flex;flex-direction:column;align-items:center;gap:9px;color:#e8dccd;font:inherit;text-align:center;cursor:pointer;animation:gcScrollBob 1.8s ease-in-out infinite}
        .gc-v3-scroll-cue{color:#fff4e8}
        .gc-v3-scroll-cue:before{content:"";position:absolute;z-index:-1;left:50%;top:50%;width:330px;height:104px;margin:-52px 0 0 -165px;border-radius:50%;background:radial-gradient(ellipse 50% 50% at 50% 50%,rgba(239,115,95,.32),rgba(239,115,95,.1) 46%,transparent 72%);animation:gcCueHalo 2.6s ease-in-out infinite}
        @keyframes gcCueHalo{0%,100%{opacity:.5;transform:scale(.86)}50%{opacity:1;transform:scale(1.08)}}
        .gc-v3-scroll-cue span{padding:0;border:0;background:none;box-shadow:none;color:inherit;font-size:clamp(15.5px,1.45vw,19px);font-weight:800;letter-spacing:.005em;white-space:nowrap;text-shadow:0 2px 18px rgba(0,0,0,.45);animation:none}
        .gc-v3-scroll-cue b{width:14px;height:14px;border-right:3px solid #ef735f;border-bottom:3px solid #ef735f;border-radius:0 0 2px 0;transform:rotate(45deg);animation:none}
        .gc-v3-next-arrow{animation:gcScrollPulse 1.8s ease-in-out infinite}
        @keyframes gcScrollBob{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
        @keyframes gcScrollPulse{0%,100%{transform:translateY(0)}45%{transform:translateY(6px)}}
        .gc-v3-phase{--phase-color:#ef735f;position:relative;height:100dvh;min-height:100dvh;overflow:hidden;border-top:1px solid rgba(255,255,255,.06);scroll-snap-align:start;scroll-snap-stop:always}.gc-v3-phase-one{--dwell:4.6s}.gc-v3-phase-two{--phase-color:#7ed6cb;--dwell:3.4s}.gc-v3-phase-three{--phase-color:#ffc36f;--dwell:3.4s}.gc-v3-phase:before{content:"";position:absolute;z-index:2;left:50%;top:0;bottom:0;width:1.5px;transform-origin:50% 0;transform:scaleY(var(--thread-fill,0));background:color-mix(in srgb,var(--phase-color) 62%,transparent);box-shadow:0 0 20px color-mix(in srgb,var(--phase-color) 34%,transparent)}
        /* The bead riding the leading end of the thread. */
        /* ── The thread ──
           One unbroken line down the middle, with a torch running down it. The
           torch takes exactly as long to reach the bottom as the phase takes to
           hand over, so it arrives as the page turns. */
        .gc-v3-thread{position:absolute;z-index:2;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;overflow:hidden;background:color-mix(in srgb,var(--phase-color) 30%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--phase-color) 22%,transparent)}
        .gc-v3-thread>b{position:absolute;left:-9px;right:-9px;top:0;height:132px;border-radius:50%;background:radial-gradient(ellipse 50% 50% at 50% 78%,#fff4e8 0 14%,var(--phase-color) 34%,color-mix(in srgb,var(--phase-color) 42%,transparent) 58%,transparent 74%);opacity:0}
        .gc-v3-phase[data-active=true] .gc-v3-thread>b{animation:gcTorchDown var(--dwell,4.6s) linear both}
        /* Sits above the line's top edge at the start and clears the bottom at
           the end, so the run covers the full height of the phase. */
        @keyframes gcTorchDown{0%{opacity:0;transform:translateY(-132px)}5%{opacity:1}92%{opacity:1}100%{opacity:0;transform:translateY(100dvh)}}
        .gc-v3-phase-inner{position:relative;top:0;min-height:100%;box-sizing:border-box;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:clamp(72px,22vw,300px);max-width:1180px;margin:0 auto;padding:112px 50px 112px}.gc-v3-reverse .gc-v3-copy{order:2}.gc-v3-reverse .gc-v3-art{order:1}
        .gc-v3-copy{position:relative;z-index:5;transition:transform .12s linear,opacity .12s linear}.gc-v3-copy small{display:inline-flex;align-items:center;gap:8px;color:var(--phase-color);font-size:10px;font-weight:900;letter-spacing:.2em}.gc-v3-copy small:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--phase-color);box-shadow:0 0 0 5px color-mix(in srgb,var(--phase-color) 13%,transparent),0 0 18px var(--phase-color)}.gc-v3-copy h2{margin:12px 0 14px;color:#fff4e8;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(42px,5vw,70px);line-height:.98;letter-spacing:-.05em}.gc-v3-copy p{max-width:470px;margin:0;color:#bfd0ce;font-size:clamp(16px,1.45vw,20px);line-height:1.55}
        .gc-v3-art{position:relative;z-index:3;min-height:410px;transition:transform .12s linear,opacity .12s linear;will-change:transform,opacity}.gc-v3-message-art{display:grid;place-items:center}.gc-v3-message-card{position:relative;width:min(470px,88%);min-height:210px;box-sizing:border-box;padding:34px;border:1px solid rgba(255,193,159,.35);border-radius:30px;background:linear-gradient(145deg,rgba(255,244,232,.98),rgba(239,225,213,.95));box-shadow:0 35px 80px rgba(3,18,27,.36);color:#203746;font-family:Georgia,serif;font-size:clamp(21px,2.3vw,31px);line-height:1.25}.gc-v3-message-card i{position:absolute;bottom:22px;width:7px;height:7px;border-radius:50%;background:#ef735f}.gc-v3-message-card i:nth-child(2){left:34px}.gc-v3-message-card i:nth-child(3){left:48px;opacity:.6}.gc-v3-message-card i:nth-child(4){left:62px;opacity:.3}
        .gc-v3-typed-copy{display:block}
        .gc-v3-float-chip,.gc-v3-signal{position:absolute;padding:9px 13px;border:1px solid rgba(255,193,159,.34);border-radius:999px;background:rgba(21,43,56,.92);box-shadow:0 12px 28px rgba(0,0,0,.26);color:#ffd2bb;font-size:12px;font-weight:800}.gc-v3-chip-a{left:2%;top:16%;transform:rotate(-8deg)}.gc-v3-chip-b{right:0;top:27%;transform:rotate(7deg)}.gc-v3-chip-c{right:12%;bottom:10%;transform:rotate(-4deg)}
        /* ── Step rail (replaces the "PASSAGGIO 0N" caption) ── */
        .gc-v3-rail{display:flex;align-items:stretch;gap:0;margin-bottom:20px}
        .gc-v3-rail-stop{position:relative;flex:0 0 auto;display:flex;align-items:center;gap:9px;padding:0 18px 0 0;border:0;background:none;color:#7d979c;font:800 11.5px 'Hanken Grotesk',sans-serif;letter-spacing:.13em;text-transform:uppercase;cursor:pointer;transition:color .3s ease}
        .gc-v3-rail-stop:not(:last-child):after{content:"";position:absolute;right:7px;top:50%;width:6px;height:1px;background:rgba(255,255,255,.2)}
        .gc-v3-rail-stop i{position:relative;width:26px;height:26px;flex:0 0 auto;display:grid;place-items:center;border:1.5px solid rgba(255,255,255,.24);border-radius:50%;background:rgba(255,255,255,.04);transition:border-color .3s ease,background .3s ease,transform .3s ease}
        .gc-v3-rail-stop i:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.5;transition:opacity .3s ease}
        .gc-v3-rail-stop b{position:absolute;inset:-6px;border:1.5px solid var(--phase-color);border-radius:50%;opacity:.42;animation:gcRailPulse 2.1s ease-in-out infinite}
        .gc-v3-rail-stop[data-state=done]{color:#a9c3c0}.gc-v3-rail-stop[data-state=done] i{border-color:rgba(255,255,255,.4)}.gc-v3-rail-stop[data-state=done] i:before{opacity:.85}
        .gc-v3-rail-stop[data-state=current]{color:var(--phase-color)}
        .gc-v3-rail-stop[data-state=current] i{border-color:var(--phase-color);background:color-mix(in srgb,var(--phase-color) 20%,transparent);transform:scale(1.12);box-shadow:0 0 20px color-mix(in srgb,var(--phase-color) 40%,transparent)}
        .gc-v3-rail-stop[data-state=current] i:before{opacity:1}
        .gc-v3-rail-stop:hover{color:#fff4e8}.gc-v3-rail-stop:hover i{border-color:rgba(255,255,255,.55)}
        @keyframes gcRailPulse{0%,100%{transform:scale(1);opacity:.42}50%{transform:scale(1.22);opacity:0}}

        /* ── Phase 2: Gifty AI map ──
           The animation explains the real product loop: details from the
           message enter the AI, become weighted insights, then point to gifts. */
        .gc-v3-ai-map{width:min(500px,100%);box-sizing:border-box;padding:16px 17px 15px;border:1px solid rgba(126,214,203,.24);border-radius:24px;background:radial-gradient(circle at 50% 48%,rgba(126,214,203,.12),transparent 34%),linear-gradient(155deg,rgba(17,48,60,.98),rgba(8,29,40,.96));box-shadow:0 28px 58px rgba(2,18,27,.4),inset 0 1px 0 rgba(255,255,255,.06)}
        .gc-v3-ai-map-head{display:flex;align-items:center;gap:8px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,.08)}
        .gc-v3-ai-map-head>i{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#7ed6cb;box-shadow:0 0 0 5px rgba(126,214,203,.1),0 0 18px rgba(126,214,203,.7)}
        .gc-v3-ai-map-head>b{color:#dff3ef;font:850 10.5px 'Hanken Grotesk',sans-serif;letter-spacing:.16em;text-transform:uppercase}
        .gc-v3-ai-map-head>em{margin-left:auto;color:#7ed6cb;font:800 11px 'Hanken Grotesk',sans-serif;font-style:normal;font-variant-numeric:tabular-nums}
        .gc-v3-ai-map-flow{position:relative;display:grid;grid-template-columns:1fr 48px 92px 48px 1fr;align-items:center;min-height:188px;padding:8px 0 5px}
        .gc-v3-ai-input,.gc-v3-ai-insights{display:flex;flex-direction:column;gap:7px}
        .gc-v3-ai-input>small,.gc-v3-ai-insights>small,.gc-v3-ai-gifts>small{color:#76969a;font:850 8px 'Hanken Grotesk',sans-serif;letter-spacing:.17em}
        .gc-v3-ai-input span{align-self:flex-end;max-width:115px;padding:6px 9px;border:1px solid rgba(255,193,159,.24);border-radius:9px;background:rgba(255,193,159,.08);color:#f5d8c5;font:750 10px 'Hanken Grotesk',sans-serif;opacity:0}
        .gc-v3-ai-insights span{display:flex;align-items:center;gap:6px;padding:6px 7px;border:1px solid rgba(126,214,203,.2);border-radius:9px;background:rgba(126,214,203,.08);color:#dff3ef;font:750 10px 'Hanken Grotesk',sans-serif;opacity:0}
        .gc-v3-ai-insights span>i{width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:#7ed6cb;box-shadow:0 0 8px rgba(126,214,203,.7)}
        .gc-v3-ai-insights span>b{margin-left:auto;color:#7ed6cb;font-size:9px;font-variant-numeric:tabular-nums}
        .gc-v3-ai-beam{position:relative;height:2px;overflow:hidden;background:rgba(126,214,203,.12)}
        .gc-v3-ai-beam:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,#7ed6cb,transparent);transform:translateX(-110%)}
        .gc-v3-ai-beam>i{position:absolute;top:50%;right:0;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:#fff4e8;box-shadow:0 0 13px #7ed6cb;opacity:0}
        .gc-v3-ai-beam-out{transform:scaleX(-1)}
        .gc-v3-ai-brain{position:relative;width:82px;height:82px;margin:auto;display:grid;place-items:center;border:1px solid rgba(126,214,203,.48);border-radius:26px;background:linear-gradient(145deg,rgba(126,214,203,.24),rgba(239,115,95,.13));box-shadow:0 0 0 8px rgba(126,214,203,.05),0 18px 34px rgba(1,16,24,.34)}
        .gc-v3-ai-brain:before{content:"";position:absolute;inset:9px;border:1px solid rgba(255,244,232,.16);border-radius:20px}
        .gc-v3-ai-brain>b{position:relative;color:#fff4e8;font:850 27px/1 'Bricolage Grotesque',sans-serif;letter-spacing:-.06em}
        .gc-v3-ai-brain>small{position:absolute;bottom:13px;color:#7ed6cb;font:850 6.5px 'Hanken Grotesk',sans-serif;letter-spacing:.16em}
        .gc-v3-ai-brain>i{position:absolute;width:7px;height:7px;border-radius:50%;background:#7ed6cb;opacity:.34}.gc-v3-ai-brain>i:nth-child(1){left:13px;top:16px}.gc-v3-ai-brain>i:nth-child(2){right:13px;top:16px}.gc-v3-ai-brain>i:nth-child(3){left:13px;bottom:16px}
        .gc-v3-ai-gifts{padding-top:11px;border-top:1px solid rgba(255,255,255,.07)}
        .gc-v3-ai-gifts>div{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}
        .gc-v3-ai-gifts span{min-width:0;padding:7px 8px;border:1px solid rgba(255,193,159,.24);border-radius:10px;background:rgba(255,193,159,.1);color:#ffe2cd;font:750 9.5px/1.15 'Hanken Grotesk',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0}
        .gc-v3-ai-gifts span>b{display:inline-grid;place-items:center;width:20px;height:20px;margin-right:6px;border-radius:6px;background:#ef735f;color:#17303e;font-size:8px}
        @media(max-width:900px){
          .gc-v3-ai-map{padding:12px 12px 11px;border-radius:18px}
          .gc-v3-ai-map-head{padding-bottom:9px}.gc-v3-ai-map-head>b{font-size:9px}.gc-v3-ai-map-head>em{font-size:9.5px}
          .gc-v3-ai-map-flow{grid-template-columns:1fr 24px 72px 24px 1fr;min-height:142px;padding:5px 0 3px}
          .gc-v3-ai-input,.gc-v3-ai-insights{gap:4px}.gc-v3-ai-input>small,.gc-v3-ai-insights>small,.gc-v3-ai-gifts>small{font-size:6.8px}
          .gc-v3-ai-input span,.gc-v3-ai-insights span{padding:4px 5px;border-radius:7px;font-size:8px}
          .gc-v3-ai-input span{max-width:88px}.gc-v3-ai-insights span>b{font-size:7px}
          .gc-v3-ai-brain{width:62px;height:62px;border-radius:20px}.gc-v3-ai-brain:before{inset:7px;border-radius:15px}.gc-v3-ai-brain>b{font-size:21px}.gc-v3-ai-brain>small{bottom:9px;font-size:5px}
          .gc-v3-ai-brain>i{width:5px;height:5px}.gc-v3-ai-brain>i:nth-child(1){left:10px;top:12px}.gc-v3-ai-brain>i:nth-child(2){right:10px;top:12px}.gc-v3-ai-brain>i:nth-child(3){left:10px;bottom:12px}
          .gc-v3-ai-gifts{padding-top:8px}.gc-v3-ai-gifts>div{gap:4px;margin-top:5px}.gc-v3-ai-gifts span{padding:5px;font-size:7.5px}.gc-v3-ai-gifts span>b{width:16px;height:16px;margin-right:3px;font-size:6px}
        }
        /* Phase 2 stays deliberately open: clues, AI and criteria are three
           separate moments rather than one dashboard-shaped block. */
        .gc-v3-ai-canvas{position:relative;width:min(540px,100%);height:350px;min-height:0;margin:auto}
        .gc-v3-ai-routes{position:absolute;inset:10px 0 0;width:100%;height:330px;overflow:visible}
        .gc-v3-ai-routes path{fill:none;stroke:rgba(126,214,203,.34);stroke-width:1.5;stroke-linecap:round;stroke-dasharray:5 9;opacity:.22}
        .gc-v3-ai-count{position:absolute;left:50%;top:0;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:7px 12px;border:1px solid rgba(126,214,203,.2);border-radius:999px;background:rgba(13,39,51,.7);color:#b9d9d5;font:750 9px 'Hanken Grotesk',sans-serif;letter-spacing:.08em;white-space:nowrap;opacity:0}
        .gc-v3-ai-count i{width:6px;height:6px;border-radius:50%;background:#7ed6cb;box-shadow:0 0 13px rgba(126,214,203,.95)}
        .gc-v3-ai-clues,.gc-v3-ai-findings{position:absolute;top:54px;display:flex;flex-direction:column;gap:15px}
        .gc-v3-ai-clues{left:0;width:132px}.gc-v3-ai-findings{right:0;width:152px}
        .gc-v3-ai-clues>small,.gc-v3-ai-findings>small{margin-bottom:1px;color:#7d9a9e;font:850 7.5px 'Hanken Grotesk',sans-serif;letter-spacing:.18em}
        .gc-v3-ai-clues span{align-self:flex-start;padding:8px 12px;border:1px solid rgba(255,193,159,.32);border-radius:999px;background:rgba(255,193,159,.1);box-shadow:0 10px 24px rgba(3,18,27,.2);color:#ffd8c2;font:800 10.5px 'Hanken Grotesk',sans-serif;opacity:0}
        .gc-v3-ai-orb{position:absolute;left:50%;top:52%;width:120px;height:120px;transform:translate(-50%,-45%);display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(126,214,203,.52);border-radius:50%;background:radial-gradient(circle at 38% 28%,rgba(255,255,255,.22),transparent 20%),linear-gradient(145deg,rgba(126,214,203,.3),rgba(239,115,95,.18));box-shadow:0 0 0 9px rgba(126,214,203,.05),0 22px 55px rgba(2,18,27,.38),0 0 42px rgba(126,214,203,.16);opacity:0}
        .gc-v3-ai-orb>span{color:#fff4e8;font:700 25px/1 'Bricolage Grotesque',sans-serif}.gc-v3-ai-orb>b{margin-top:5px;color:#fff4e8;font:850 15px 'Hanken Grotesk',sans-serif}.gc-v3-ai-orb>small{margin-top:2px;color:#7ed6cb;font:850 6px 'Hanken Grotesk',sans-serif;letter-spacing:.17em}
        .gc-v3-ai-orb>i{position:absolute;inset:-1px;border:1px solid rgba(126,214,203,.28);border-radius:50%;opacity:0}.gc-v3-ai-orb>i:nth-child(2){inset:10px}.gc-v3-ai-orb>i:nth-child(3){inset:21px}
        .gc-v3-ai-findings span{display:flex;align-items:center;gap:7px;padding:8px 9px;border:1px solid rgba(126,214,203,.25);border-radius:11px;background:rgba(126,214,203,.09);box-shadow:0 10px 24px rgba(3,18,27,.2);color:#e1f2ef;font:750 10px 'Hanken Grotesk',sans-serif;opacity:0}
        .gc-v3-ai-findings span i{width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:#7ed6cb;box-shadow:0 0 9px rgba(126,214,203,.85)}.gc-v3-ai-findings span b{margin-left:auto;color:#7ed6cb;font-size:9px;font-variant-numeric:tabular-nums}
        @media(max-width:900px){
          .gc-v3-ai-canvas{width:100%;height:248px}
          .gc-v3-ai-routes{inset:0;height:248px}
          .gc-v3-ai-count{top:0;padding:5px 8px;font-size:7px}
          .gc-v3-ai-clues,.gc-v3-ai-findings{top:39px;gap:10px}.gc-v3-ai-clues{left:0;width:88px}.gc-v3-ai-findings{right:0;width:100px}
          .gc-v3-ai-clues>small,.gc-v3-ai-findings>small{font-size:6px;letter-spacing:.12em}
          .gc-v3-ai-clues span{padding:5px 7px;font-size:7.8px}
          .gc-v3-ai-orb{top:54%;width:78px;height:78px}.gc-v3-ai-orb>span{font-size:17px}.gc-v3-ai-orb>b{margin-top:3px;font-size:10.5px}.gc-v3-ai-orb>small{font-size:4.5px}
          .gc-v3-ai-findings span{gap:4px;padding:5px 6px;border-radius:8px;font-size:7.5px}.gc-v3-ai-findings span b{font-size:6.5px}
        }
        @media(max-width:900px){
          .gc-v3-rail{margin-bottom:15px}.gc-v3-rail-stop{padding-right:13px;font-size:10px;gap:7px}.gc-v3-rail-stop i{width:23px;height:23px}
        }
        /* Phase 3 cards use the same anatomy as the hero carousel — real
           photo on top, dark info panel underneath — so the results we
           promise look like the results the carousel showed. */
        .gc-v3-result-art{display:flex;align-items:center;justify-content:center;perspective:1200px}
        .gc-v3-result-art article{--gc-result-panel:76px;position:absolute;width:212px;height:288px;overflow:hidden;box-sizing:border-box;border:1px solid rgba(255,255,255,.16);border-radius:24px;background:#0f2733;box-shadow:0 30px 60px rgba(3,18,27,.45)}
        .gc-v3-result-art article>img{position:absolute;left:0;right:0;top:0;width:100%;height:calc(100% - var(--gc-result-panel));object-fit:cover;display:block}
        .gc-v3-result-art article:after{content:"";position:absolute;inset:-70% -40%;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.5) 49%,transparent 57%);transform:translateX(-80%) rotate(12deg)}
        .gc-v3-phase-three[data-active=true] .gc-v3-result-art article:after{animation:gcCardShine .65s .95s ease-out both}
        .gc-v3-result-art article:nth-child(1){transform:translateX(-145px) rotate(-12deg)}
        .gc-v3-result-art article:nth-child(2){z-index:2;transform:translateY(-20px)}
        .gc-v3-result-art article:nth-child(3){transform:translateX(145px) rotate(12deg)}
        .gc-v3-result-art article>span{position:absolute;z-index:3;top:12px;right:12px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:rgba(10,28,37,.66);backdrop-filter:blur(4px);color:#fff4e8;font-size:11px;font-weight:900}
        .gc-v3-result-body{position:absolute;z-index:2;left:0;right:0;bottom:0;height:var(--gc-result-panel);box-sizing:border-box;padding:10px 11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border-top:1px solid rgba(255,255,255,.13);background:linear-gradient(155deg,#102b38,#0b202b);text-align:center}
        .gc-v3-result-body strong{color:#fff4e8;font:750 14px/1.12 'Hanken Grotesk',sans-serif;letter-spacing:-.01em}
        .gc-v3-result-criteria{display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
        .gc-v3-result-criteria span{padding:4px 8px;border:1px solid rgba(255,193,159,.32);border-radius:999px;background:rgba(255,193,159,.15);color:#ffe2cd;font:750 10.5px 'Hanken Grotesk',sans-serif;line-height:1}
        .gc-v3-next{position:absolute;left:50%;bottom:48px;z-index:8;min-width:344px;min-height:58px;transform:translateX(-50%);padding:7px 8px 7px 20px;border:1px solid color-mix(in srgb,var(--phase-color) 48%,white);border-radius:999px;background:#fff4e8;box-shadow:0 14px 34px rgba(3,18,27,.32),0 0 0 6px color-mix(in srgb,var(--phase-color) 11%,transparent);display:flex;align-items:center;justify-content:space-between;gap:18px;color:#17303e;white-space:nowrap;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}.gc-v3-next:hover{transform:translateX(-50%) translateY(-3px);box-shadow:0 18px 38px rgba(3,18,27,.38),0 0 0 9px color-mix(in srgb,var(--phase-color) 14%,transparent)}.gc-v3-next>strong{color:#17303e;font:850 14px/1.2 'Hanken Grotesk',sans-serif}.gc-v3-next>strong>i{margin-left:5px;color:#5d7480;font-style:normal;font-weight:800}.gc-v3-next-arrow{width:38px;height:38px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.42);border-radius:50%;background:linear-gradient(145deg,color-mix(in srgb,var(--phase-color) 55%,#ffdec8),var(--phase-color));color:#17303e;font-size:17px;animation:gcScrollPulse 1.8s ease-in-out infinite}
        /* ── The thread's last run, and the parcel it arrives at ──
           The two diagonal beams that used to split apart here are gone: the
           line comes straight down out of phase 3, reaches the parcel, and
           the parcel opens. Same rule as everywhere else on this page — the
           descent is scroll-driven, the opening is opacity and transform. */
        .gc-v3-start{--phase-color:#ffc19f}
        .gc-v3-start:before,.gc-v3-start:after{content:none}
        /* ── What the parcel spills out ──
           Two clusters hugging the bottom corners, away from the middle column
           where the search bar lives. Offsets are in vw so they stay pinned to
           the edges at any width. They leave the box only after it bursts. */
        .gc-v3-pops{position:absolute;z-index:1;left:50%;bottom:clamp(40px,6vh,72px);width:0;height:0;pointer-events:none}
        .gc-v3-pop{position:absolute;left:0;bottom:0;width:clamp(72px,7.4vw,102px);aspect-ratio:4/5;margin-left:calc(clamp(72px,7.4vw,102px) / -2);border:1px solid rgba(255,255,255,.16);border-radius:14px;overflow:hidden;background:#0f2733;box-shadow:0 18px 34px rgba(3,18,27,.5);opacity:0}
        .gc-v3-pop>img{position:absolute;left:0;right:0;top:0;width:100%;height:68%;object-fit:cover;display:block}
        .gc-v3-pop>b{position:absolute;left:0;right:0;bottom:0;height:32%;box-sizing:border-box;padding:0 6px;display:flex;align-items:center;justify-content:center;border-top:1px solid rgba(255,255,255,.12);background:linear-gradient(155deg,#102b38,#0b202b);color:#fff4e8;font:750 8.5px/1.1 'Hanken Grotesk',sans-serif;text-align:center}
        .gc-v3-pop[data-slot="0"]{--pop-x:-40;--pop-y:0px;--pop-tilt:-10deg}
        .gc-v3-pop[data-slot="1"]{--pop-x:-30;--pop-y:-34px;--pop-tilt:6deg}
        .gc-v3-pop[data-slot="2"]{--pop-x:30;--pop-y:-34px;--pop-tilt:-6deg}
        .gc-v3-pop[data-slot="3"]{--pop-x:40;--pop-y:0px;--pop-tilt:9deg}
        .gc-v3-start[data-active=true] .gc-v3-pop{animation:gcPopOut .95s cubic-bezier(.22,.72,.3,1) both,gcPopBreathe 3.4s ease-in-out infinite}
        .gc-v3-start[data-active=true] .gc-v3-pop[data-slot="0"]{animation-delay:1.85s,2.8s}
        .gc-v3-start[data-active=true] .gc-v3-pop[data-slot="1"]{animation-delay:2s,2.95s}
        .gc-v3-start[data-active=true] .gc-v3-pop[data-slot="2"]{animation-delay:2.15s,3.1s}
        .gc-v3-start[data-active=true] .gc-v3-pop[data-slot="3"]{animation-delay:2.3s,3.25s}
        /* Thrown from inside the box — the start point is measured from the box
           at runtime, so it holds at any viewport height. */
        @keyframes gcPopOut{
          0%{opacity:0;transform:translate(0,var(--pop-from-y,-220px)) scale(.06) rotate(0)}
          14%{opacity:1}
          52%{transform:translate(calc(var(--pop-x) * 1.04vw),calc(var(--pop-y) - clamp(46px,7vh,80px))) scale(1.06) rotate(calc(var(--pop-tilt) * 1.4))}
          76%{transform:translate(calc(var(--pop-x) * 1vw),calc(var(--pop-y) + 7px)) scale(.97) rotate(var(--pop-tilt))}
          89%{transform:translate(calc(var(--pop-x) * 1vw),calc(var(--pop-y) - 9px)) scale(1.02) rotate(var(--pop-tilt))}
          100%{opacity:1;transform:translate(calc(var(--pop-x) * 1vw),var(--pop-y)) scale(1) rotate(var(--pop-tilt))}
        }
        @keyframes gcPopBreathe{
          0%,100%{transform:translate(calc(var(--pop-x) * 1vw),var(--pop-y)) rotate(var(--pop-tilt))}
          50%{transform:translate(calc(var(--pop-x) * 1vw),calc(var(--pop-y) - 7px)) rotate(calc(var(--pop-tilt) * .82))}
        }
        @media(max-width:900px){
          .gc-v3-pops{bottom:clamp(34px,5vh,56px)}
          .gc-v3-pop{display:none}
          .gc-v3-pop>b{font-size:7px;padding:0 4px}
          .gc-v3-pop[data-slot="0"]{--pop-x:-33;--pop-y:0px}
          .gc-v3-pop[data-slot="1"]{--pop-x:-14;--pop-y:-58px}
          .gc-v3-pop[data-slot="2"]{--pop-x:14;--pop-y:-58px}
          .gc-v3-pop[data-slot="3"]{--pop-x:33;--pop-y:0px}
        }
        /* ── The parcel ──
           Everything here hangs off the torch's arrival at 1.15s. The box used
           to fly open at 0.06s, a full second before the flame reached it, so
           the arrival and the opening read as two unrelated events. Now the
           parcel braces while the light comes down, and only bursts when it
           lands. */
        .gc-v3-parcel{position:relative;z-index:3;display:block;width:96px;height:86px;margin:0 auto 26px}
        .gc-v3-parcel-burst{position:absolute;left:50%;top:52%;width:250px;height:250px;margin:-125px 0 0 -125px;border-radius:50%;background:radial-gradient(circle,rgba(255,244,232,.7),rgba(255,195,111,.32) 34%,rgba(239,115,95,.12) 56%,transparent 70%);opacity:0}
        .gc-v3-parcel-box{position:absolute;left:50%;bottom:0;width:68px;height:60px;margin-left:-34px;border-radius:14px;background:linear-gradient(150deg,#ffc19f,#ef735f 72%);box-shadow:0 16px 34px rgba(4,20,29,.34),inset 0 1px 0 rgba(255,255,255,.5);transform-origin:50% 100%}
        .gc-v3-parcel-box>b{position:absolute;left:50%;top:0;bottom:0;width:8px;margin-left:-4px;background:rgba(23,48,62,.32)}
        .gc-v3-parcel-box>em{position:absolute;left:0;right:0;top:14px;display:grid;place-items:center;opacity:0}
        .gc-v3-parcel-lid{position:absolute;left:50%;top:14px;width:82px;height:20px;margin-left:-41px;border-radius:8px;background:linear-gradient(150deg,#ffd9bd,#ffc19f 78%);box-shadow:0 8px 18px rgba(4,20,29,.3),inset 0 1px 0 rgba(255,255,255,.6);transform-origin:50% 100%}
        .gc-v3-parcel-lid>b{position:absolute;left:50%;bottom:100%;width:8px;height:11px;margin-left:-4px;border-radius:3px 3px 0 0;background:#ffd9bd}

        .gc-v3-parcel-bit{position:absolute;left:50%;top:34%;width:7px;height:7px;margin:-3px 0 0 -3px;border-radius:2px;background:#ffc36f;opacity:0}
        .gc-v3-parcel-bit[data-bit="0"]{--bit-x:-104px;--bit-y:-86px;--bit-r:-230deg;background:#ef735f}
        .gc-v3-parcel-bit[data-bit="1"]{--bit-x:96px;--bit-y:-98px;--bit-r:250deg}
        .gc-v3-parcel-bit[data-bit="2"]{--bit-x:-136px;--bit-y:-22px;--bit-r:170deg;width:5px;height:15px}
        .gc-v3-parcel-bit[data-bit="3"]{--bit-x:128px;--bit-y:-30px;--bit-r:-200deg;width:15px;height:5px;background:#ef735f}
        .gc-v3-parcel-bit[data-bit="4"]{--bit-x:-62px;--bit-y:-118px;--bit-r:130deg;border-radius:50%}
        .gc-v3-parcel-bit[data-bit="5"]{--bit-x:58px;--bit-y:-124px;--bit-r:-150deg;border-radius:50%;background:#fff4e8}
        .gc-v3-parcel-bit[data-bit="6"]{--bit-x:-30px;--bit-y:-140px;--bit-r:200deg;background:#fff4e8}
        .gc-v3-parcel-bit[data-bit="7"]{--bit-x:26px;--bit-y:-146px;--bit-r:-260deg;width:5px;height:13px;background:#ffd9bd}
        .gc-v3-parcel-bit[data-bit="8"]{--bit-x:-160px;--bit-y:-64px;--bit-r:290deg;width:6px;height:6px;border-radius:50%;background:#ef735f}
        .gc-v3-parcel-bit[data-bit="9"]{--bit-x:152px;--bit-y:-72px;--bit-r:-280deg;width:13px;height:4px}
        .gc-v3-parcel-bit[data-bit="10"]{--bit-x:-88px;--bit-y:-150px;--bit-r:150deg;width:4px;height:12px;background:#fff4e8}
        .gc-v3-parcel-bit[data-bit="11"]{--bit-x:84px;--bit-y:-156px;--bit-r:-170deg}
        .gc-v3-parcel-bit[data-bit="12"]{--bit-x:-118px;--bit-y:-112px;--bit-r:210deg;border-radius:50%;background:#ffd9bd}
        .gc-v3-parcel-bit[data-bit="13"]{--bit-x:112px;--bit-y:-120px;--bit-r:-240deg;width:4px;height:14px;background:#ef735f}

        /* Anticipation, then impact. */
        .gc-v3-start[data-active=true] .gc-v3-parcel{animation:gcParcelBrace 1.15s cubic-bezier(.5,0,.85,.5) both}
        .gc-v3-start[data-active=true] .gc-v3-start-inner{animation:gcStartReveal .85s .18s cubic-bezier(.14,.86,.2,1) both,gcImpactShake .5s 1.15s cubic-bezier(.36,.07,.19,.97) forwards}
        .gc-v3-start[data-active=true] .gc-v3-search-bar{animation:gcSearchReveal .8s .5s cubic-bezier(.14,.88,.24,1.12) both,gcSearchArrival 2.8s 1.9s ease-in-out infinite}
        .gc-v3-start[data-active=true] .gc-v3-parcel-lid{animation:gcLidOff 1.15s 1.15s cubic-bezier(.2,.5,.3,1) both}
        .gc-v3-start[data-active=true] .gc-v3-parcel-box{animation:gcBoxSpring .68s 1.15s cubic-bezier(.2,.8,.3,1) both}
        .gc-v3-start[data-active=true] .gc-v3-parcel-box>em{animation:gcParcelContents .5s 1.5s cubic-bezier(.18,.8,.26,1.08) both}
        .gc-v3-start[data-active=true] .gc-v3-parcel-burst{animation:gcParcelBurst .85s 1.15s cubic-bezier(.2,.8,.3,1) both}
        .gc-v3-start[data-active=true] .gc-v3-parcel-bit{animation:gcBitFly 1.05s cubic-bezier(.16,.66,.24,1) both;animation-delay:calc(1.15s + var(--bit-stagger,0s))}
        .gc-v3-parcel-bit[data-bit="1"],.gc-v3-parcel-bit[data-bit="6"]{--bit-stagger:.03s}
        .gc-v3-parcel-bit[data-bit="2"],.gc-v3-parcel-bit[data-bit="7"]{--bit-stagger:.06s}
        .gc-v3-parcel-bit[data-bit="3"],.gc-v3-parcel-bit[data-bit="8"]{--bit-stagger:.09s}
        .gc-v3-parcel-bit[data-bit="4"],.gc-v3-parcel-bit[data-bit="9"]{--bit-stagger:.12s}
        .gc-v3-parcel-bit[data-bit="5"],.gc-v3-parcel-bit[data-bit="10"]{--bit-stagger:.15s}
        .gc-v3-parcel-bit[data-bit="11"]{--bit-stagger:.05s}
        .gc-v3-parcel-bit[data-bit="12"]{--bit-stagger:.11s}
        .gc-v3-parcel-bit[data-bit="13"]{--bit-stagger:.08s}

        @keyframes gcParcelBrace{0%{transform:scale(1)}72%{transform:scale(1.05)}100%{transform:scale(1.12)}}
        @keyframes gcImpactShake{0%{transform:translate(0,0) scale(1)}12%{transform:translate(-7px,3px) scale(1.014)}26%{transform:translate(6px,-4px) scale(1.01)}42%{transform:translate(-5px,-2px) scale(1.006)}58%{transform:translate(4px,3px) scale(1.003)}74%{transform:translate(-2px,-1px) scale(1)}100%{transform:none}}
        @keyframes gcLidOff{0%{transform:translate(0,0) rotate(0)}34%{transform:translate(calc(var(--lid-x,86px) * .3),calc(var(--lid-y,40px) - 142px)) rotate(-66deg)}100%{transform:translate(var(--lid-x,86px),var(--lid-y,40px)) rotate(-196deg)}}
        @keyframes gcBoxSpring{0%{transform:scale(1,1)}30%{transform:scale(1.12,.86)}100%{transform:scale(1,1)}}
        @keyframes gcParcelContents{0%{opacity:0;transform:translateY(16px) scale(.5)}70%{opacity:1;transform:translateY(-3px) scale(1.08)}100%{opacity:1;transform:none}}
        @keyframes gcParcelBurst{0%{opacity:0;transform:scale(.2)}26%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
        @keyframes gcBitFly{0%{opacity:0;transform:translate(0,0) scale(.3) rotate(0)}14%{opacity:1}100%{opacity:0;transform:translate(var(--bit-x),var(--bit-y)) scale(1.1) rotate(var(--bit-r))}}
        @media(max-width:900px){
          .gc-v3-parcel{width:84px;height:76px;margin-bottom:20px}
          .gc-v3-parcel-box{width:60px;height:52px;margin-left:-30px;border-radius:12px}
          .gc-v3-parcel-lid{width:72px;height:17px;margin-left:-36px;top:12px;--lid-x:70px;--lid-y:34px}
          .gc-v3-parcel-burst{width:170px;height:170px;margin:-85px 0 0 -85px}
          .gc-v3-parcel-bit[data-bit="0"]{--bit-x:-74px;--bit-y:-62px}
          .gc-v3-parcel-bit[data-bit="1"]{--bit-x:68px;--bit-y:-70px}
          .gc-v3-parcel-bit[data-bit="2"]{--bit-x:-96px;--bit-y:-18px}
          .gc-v3-parcel-bit[data-bit="3"]{--bit-x:90px;--bit-y:-24px}
          .gc-v3-parcel-bit[data-bit="4"]{--bit-x:-46px;--bit-y:-84px}
          .gc-v3-parcel-bit[data-bit="5"]{--bit-x:42px;--bit-y:-88px}
          .gc-v3-parcel-bit[data-bit="6"]{--bit-x:-22px;--bit-y:-100px}
          .gc-v3-parcel-bit[data-bit="7"]{--bit-x:20px;--bit-y:-104px}
          .gc-v3-parcel-bit[data-bit="8"]{--bit-x:-112px;--bit-y:-46px}
          .gc-v3-parcel-bit[data-bit="9"]{--bit-x:106px;--bit-y:-52px}
          .gc-v3-parcel-bit[data-bit="10"]{--bit-x:-62px;--bit-y:-106px}
          .gc-v3-parcel-bit[data-bit="11"]{--bit-x:60px;--bit-y:-110px}
          .gc-v3-parcel-bit[data-bit="12"]{--bit-x:-84px;--bit-y:-80px}
          .gc-v3-parcel-bit[data-bit="13"]{--bit-x:80px;--bit-y:-86px}
        }
        .gc-v3-start{position:relative;min-height:92dvh;overflow:hidden;display:grid;place-items:center;padding:64px 24px 150px;box-sizing:border-box;background:radial-gradient(circle at 50% 45%,rgba(239,115,95,.18),transparent 38%)}.gc-v3-start-inner{position:relative;z-index:3;width:min(620px,100%);text-align:center;will-change:transform,opacity}.gc-v3-start-inner>p{margin:0 0 8px;color:#ef735f;font-size:10px;font-weight:900;letter-spacing:.2em}.gc-v3-start-inner h2{margin:0;color:#fff4e8;font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(46px,6vw,78px);font-weight:650;line-height:1;letter-spacing:-.05em}.gc-v3-start-sub{display:block;margin:15px auto 28px;color:#b9ccca;font-size:14px}.gc-v3-search-bar{width:100%;min-height:68px;padding:8px 13px 8px 10px;display:flex;align-items:center;gap:13px;border:2px solid #ef735f;border-radius:999px;background:#fffaf4;box-shadow:0 0 0 7px rgba(239,115,95,.13),0 22px 50px rgba(3,18,27,.32);color:#203746;cursor:pointer;text-align:left;animation:gcSearchArrival 2.8s ease-in-out infinite}.gc-v3-search-bar>span{width:46px;height:46px;display:grid;place-items:center;border-radius:50%;background:#203746;color:#fff4e8}.gc-v3-search-bar strong{flex:1;font-size:16px}.gc-v3-search-bar b{font-size:28px;color:#ef735f}.gc-v3-legal{position:absolute;z-index:8;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:9px;white-space:nowrap;color:#a9bfbc;font-size:12.5px}.gc-v3-legal a,.gc-v3-legal>button:not(.gc-v2-info){padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}
        @keyframes gcSearchArrival{0%,100%{transform:scale(1)}50%{transform:scale(1.014)}}
        /* ── Phase choreographies ──
           Every keyframe below animates only opacity and transform. The set
           this replaces animated filter:blur() in 22 places (up to 70px, one
           of them full-bleed) plus box-shadow and border-width, which force a
           full re-raster every frame — that is what made the phases stutter
           while the scroll-snap was still moving. */
        .gc-v3-phase[data-active=true] .gc-v3-copy{animation:gcCopyArrival .5s 0s cubic-bezier(.16,.84,.24,1) both}
        .gc-v3-phase[data-active=true] .gc-v3-rail-stop{animation:gcRailIn .42s cubic-bezier(.16,.86,.24,1.08) both}
        .gc-v3-phase[data-active=true] .gc-v3-rail-stop:nth-child(1){animation-delay:.06s}
        .gc-v3-phase[data-active=true] .gc-v3-rail-stop:nth-child(2){animation-delay:.12s}
        .gc-v3-phase[data-active=true] .gc-v3-rail-stop:nth-child(3){animation-delay:.18s}
        .gc-v3-phase[data-active=true] .gc-v3-next{animation:gcCtaArrival .45s .5s cubic-bezier(.18,.86,.26,1) both}
        @keyframes gcCopyArrival{0%{opacity:0;transform:translateY(34px)}100%{opacity:1;transform:none}}
        @keyframes gcRailIn{0%{opacity:0;transform:translateY(12px) scale(.8)}100%{opacity:1;transform:none}}
        @keyframes gcCtaArrival{0%{opacity:0;transform:translateX(-50%) translateY(24px)}100%{opacity:1;transform:translateX(-50%)}}
        /* Phase 1 — someone writing. The card lands, the sentence types itself
           out under a caret, then the three words Gifty picked up lift off the
           text one at a time. */
        .gc-v3-phase-one[data-active=true] .gc-v3-message-card{animation:gcCardLand .5s 0s cubic-bezier(.16,.86,.22,1.04) both}
        /* The caret is a real inline element sitting after the last typed
           character, so it walks along the text and wraps with it. */
        .gc-v3-caret{display:inline-block;width:3px;height:.95em;margin-left:3px;vertical-align:-.09em;border-radius:2px;background:#ef735f;animation:gcCaretBlink 1s steps(1,end) infinite}
        .gc-v3-message-art[data-typed=true] .gc-v3-caret{animation:gcCaretBlink 1s steps(1,end) 3 forwards}
        @keyframes gcCaretBlink{0%,49%{opacity:1}50%,100%{opacity:0}}
        /* The chips lift off once the sentence is finished, not on a timer —
           they mark the words Gifty picked out of what was just written. */
        .gc-v3-message-art[data-typed=true] .gc-v3-float-chip{animation:gcChipLift .5s cubic-bezier(.14,.9,.24,1.24) both}
        .gc-v3-message-art[data-typed=true] .gc-v3-chip-a{animation-delay:.12s}
        .gc-v3-message-art[data-typed=true] .gc-v3-chip-b{animation-delay:.27s}
        .gc-v3-message-art[data-typed=true] .gc-v3-chip-c{animation-delay:.42s}
        .gc-v3-message-art:not([data-typed=true]) .gc-v3-float-chip{opacity:0}
        .gc-v3-chip-a{--chip-r:-8deg}.gc-v3-chip-b{--chip-r:7deg}.gc-v3-chip-c{--chip-r:-4deg}
        @keyframes gcCardLand{0%{opacity:0;transform:translateY(46px) scale(.94)}100%{opacity:1;transform:none}}
        @keyframes gcChipLift{0%{opacity:0;transform:translateY(16px) scale(.5) rotate(var(--chip-r,0deg))}70%{opacity:1;transform:translateY(-3px) scale(1.06) rotate(var(--chip-r,0deg))}100%{opacity:1;transform:scale(1) rotate(var(--chip-r,0deg))}}
        /* Phase 2 — message details travel into Gifty AI; the core makes the
           connection visible, then insights and matching gifts resolve. */
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-map{animation:gcCardLand .48s cubic-bezier(.16,.86,.22,1.04) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-map-head>i{animation:gcAiLive 1.15s .35s ease-in-out infinite}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-input span{animation:gcClueFeed .48s cubic-bezier(.16,.86,.24,1.1) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-input span:nth-child(2){animation-delay:.18s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-input span:nth-child(3){animation-delay:.3s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-input span:nth-child(4){animation-delay:.42s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-input span:nth-child(5){animation-delay:.54s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-beam-in:after{animation:gcBeamIn .72s .56s ease-in-out both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-beam-in>i{animation:gcSignalTravel .72s .56s ease-in-out both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-brain{animation:gcAiThink .82s .9s cubic-bezier(.2,.75,.25,1) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-brain>i{animation:gcAiNode 1s 1.05s ease-in-out infinite}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-brain>i:nth-child(2){animation-delay:1.2s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-brain>i:nth-child(3){animation-delay:1.35s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-beam-out:after{animation:gcBeamIn .66s 1.35s ease-in-out both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-beam-out>i{animation:gcSignalTravel .66s 1.35s ease-in-out both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-insights span{animation:gcInsightResolve .45s cubic-bezier(.14,.88,.24,1.12) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-insights span:nth-child(2){animation-delay:1.62s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-insights span:nth-child(3){animation-delay:1.76s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-insights span:nth-child(4){animation-delay:1.9s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-gifts span{animation:gcGiftMatch .5s cubic-bezier(.14,.88,.24,1.12) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-gifts span:nth-child(1){animation-delay:2.08s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-gifts span:nth-child(2){animation-delay:2.2s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-gifts span:nth-child(3){animation-delay:2.32s}
        @keyframes gcAiLive{0%,100%{opacity:.35;transform:scale(.78)}50%{opacity:1;transform:scale(1.18)}}
        @keyframes gcClueFeed{0%{opacity:0;transform:translateX(-24px) scale(.84)}72%{opacity:1;transform:translateX(3px) scale(1.03)}100%{opacity:1;transform:none}}
        @keyframes gcBeamIn{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
        @keyframes gcSignalTravel{0%{opacity:0;transform:translateX(-38px) scale(.6)}20%,78%{opacity:1}100%{opacity:0;transform:translateX(2px) scale(1.25)}}
        @keyframes gcAiThink{0%{opacity:0;transform:scale(.72) rotate(-8deg)}58%{opacity:1;transform:scale(1.1) rotate(2deg)}100%{opacity:1;transform:none;box-shadow:0 0 0 8px rgba(126,214,203,.05),0 18px 34px rgba(1,16,24,.34)}}
        @keyframes gcAiNode{0%,100%{opacity:.28;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}
        @keyframes gcInsightResolve{0%{opacity:0;transform:translateX(22px) scale(.84)}70%{opacity:1;transform:translateX(-3px) scale(1.03)}100%{opacity:1;transform:none}}
        @keyframes gcGiftMatch{0%{opacity:0;transform:translateY(16px) scale(.82)}70%{opacity:1;transform:translateY(-2px) scale(1.02)}100%{opacity:1;transform:none}}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-count{animation:gcAiCountIn .38s .08s ease-out both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-routes path{animation:gcRouteFlow 1.8s .3s linear infinite}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-routes path:nth-child(2),.gc-v3-phase-two[data-active=true] .gc-v3-ai-routes path:nth-child(5){animation-delay:.42s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-routes path:nth-child(3),.gc-v3-phase-two[data-active=true] .gc-v3-ai-routes path:nth-child(6){animation-delay:.54s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-clues span{animation:gcOpenClueIn .42s cubic-bezier(.16,.86,.24,1.08) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-clues span:nth-child(2){animation-delay:.16s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-clues span:nth-child(3){animation-delay:.3s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-clues span:nth-child(4){animation-delay:.44s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-orb{animation:gcOrbArrive .64s .58s cubic-bezier(.15,.86,.24,1.08) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-orb>i{animation:gcOrbRing 1.85s 1.05s ease-out infinite}.gc-v3-phase-two[data-active=true] .gc-v3-ai-orb>i:nth-child(2){animation-delay:1.28s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-orb>i:nth-child(3){animation-delay:1.51s}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-findings span{animation:gcFindingIn .43s cubic-bezier(.14,.88,.24,1.1) both}
        .gc-v3-phase-two[data-active=true] .gc-v3-ai-findings span:nth-child(2){animation-delay:1.08s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-findings span:nth-child(3){animation-delay:1.24s}.gc-v3-phase-two[data-active=true] .gc-v3-ai-findings span:nth-child(4){animation-delay:1.4s}
        @keyframes gcAiCountIn{from{opacity:0;transform:translate(-50%,-10px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes gcRouteFlow{0%{stroke-dashoffset:0;opacity:.18}50%{opacity:.78}100%{stroke-dashoffset:-56;opacity:.28}}
        @keyframes gcOpenClueIn{0%{opacity:0;transform:translateX(-20px) scale(.86)}72%{opacity:1;transform:translateX(2px) scale(1.03)}100%{opacity:1;transform:none}}
        @keyframes gcOrbArrive{0%{opacity:0;transform:translate(-50%,-45%) scale(.52) rotate(-8deg)}70%{opacity:1;transform:translate(-50%,-45%) scale(1.08) rotate(2deg)}100%{opacity:1;transform:translate(-50%,-45%) scale(1)}}
        @keyframes gcOrbRing{0%{opacity:.48;transform:scale(.72)}100%{opacity:0;transform:scale(1.62)}}
        @keyframes gcFindingIn{0%{opacity:0;transform:translateX(20px) scale(.86)}72%{opacity:1;transform:translateX(-2px) scale(1.03)}100%{opacity:1;transform:none}}
        /* Phase 3 — dealing a hand. The three cards arrive as one stack from
           below, then fan out centre, left, right, one after another. */
        .gc-v3-phase-three .gc-v3-result-art article:nth-child(1){--result-x:-145px;--result-r:-12deg}
        .gc-v3-phase-three .gc-v3-result-art article:nth-child(2){--result-x:0px;--result-r:0deg}
        .gc-v3-phase-three .gc-v3-result-art article:nth-child(3){--result-x:145px;--result-r:12deg}
        .gc-v3-phase-three[data-active=true] .gc-v3-result-art article{animation:gcDeal .62s cubic-bezier(.16,.86,.22,1.06) both}
        .gc-v3-phase-three[data-active=true] .gc-v3-result-art article:nth-child(2){animation-delay:.04s}
        .gc-v3-phase-three[data-active=true] .gc-v3-result-art article:nth-child(1){animation-delay:.18s}
        .gc-v3-phase-three[data-active=true] .gc-v3-result-art article:nth-child(3){animation-delay:.32s}
        /* Lost in an earlier edit while its usage stayed behind, so the shine
           on the phase-3 cards silently never played. */
        @keyframes gcCardShine{0%{opacity:0;transform:translateX(-80%) rotate(12deg)}35%{opacity:1}100%{opacity:0;transform:translateX(90%) rotate(12deg)}}
        @keyframes gcDeal{0%{opacity:0;transform:translate(0,120px) rotate(0deg) scale(.88)}60%{opacity:1;transform:translate(calc(var(--result-x) * 1.07),-6px) rotate(calc(var(--result-r) * 1.12)) scale(1.02)}100%{opacity:1;transform:translateX(var(--result-x)) rotate(var(--result-r))}}
        @media(max-width:900px){
          .gc-v3-phase-three .gc-v3-result-art article:nth-child(1){--result-x:-87px}
          .gc-v3-phase-three .gc-v3-result-art article:nth-child(3){--result-x:87px}
          .gc-v3-phase-one[data-active=true] .gc-v3-message-card:after{top:25px;left:25px}
        }
        
        @keyframes gcStartReveal{0%{opacity:0;transform:translateY(60px) scale(.86)}100%{opacity:1;transform:none}}
        @keyframes gcSearchReveal{0%{opacity:0;transform:translateY(32px) scaleX(.7)}68%{opacity:1;transform:translateY(-3px) scaleX(1.02)}100%{opacity:1;transform:none}}
        @media(max-width:900px){.gc-landing-v2-header{height:64px;padding:10px 16px}.gc-v3-journey{margin-top:-64px}.gc-v3-hero{padding:80px 0 16px}.gc-v3-hero h1{font-size:clamp(26px,7.4vw,36px)}.gc-v3-hero .gc-v2-benefits{margin-top:11px;font-size:11px}.gc-v3-scroll-cue{margin-top:12px;justify-content:center}.gc-v3-phase:before{left:24px}.gc-v3-phase-inner{top:0;min-height:100%;display:flex;flex-direction:column;justify-content:center;gap:28px;padding:82px 20px 82px}.gc-v3-reverse .gc-v3-copy,.gc-v3-reverse .gc-v3-art{order:initial}.gc-v3-copy{width:100%;padding-left:24px;box-sizing:border-box}.gc-v3-copy small{font-size:8.5px}.gc-v3-copy h2{margin:8px 0 9px;font-size:clamp(35px,10vw,45px)}.gc-v3-copy p{font-size:14px;line-height:1.45}.gc-v3-art{width:100%;min-height:300px}.gc-v3-message-card{min-height:170px;padding:25px;font-size:21px;border-radius:23px}.gc-v3-chip-a{left:0;top:8%}.gc-v3-chip-b{right:0;top:22%}.gc-v3-chip-c{right:7%;bottom:5%}.gc-v3-ai-core{width:96px;height:96px;border-radius:27px}.gc-v3-ai-core span{font-size:32px}.gc-v3-orbit-one{width:230px;height:145px}.gc-v3-orbit-two{width:300px;height:205px}.gc-v3-signal{padding:7px 10px;font-size:10px}.gc-v3-result-art article{--gc-result-panel:64px;width:150px;height:212px;padding:0;border-radius:18px}.gc-v3-result-art article:nth-child(1){transform:translateX(-87px) rotate(-12deg)}.gc-v3-result-art article:nth-child(2){transform:translateY(-15px)}.gc-v3-result-art article:nth-child(3){transform:translateX(87px) rotate(12deg)}.gc-v3-result-body{padding:8px 7px;gap:5px}.gc-v3-result-body strong{font-size:11.5px}.gc-v3-result-criteria span{padding:3px 6px;font-size:9px}.gc-v3-result-art article>span{width:22px;height:22px;top:8px;right:8px;font-size:9.5px}.gc-v3-start{min-height:100dvh;padding:56px 18px 120px}.gc-v3-start-inner h2{font-size:48px}.gc-v3-start-sub{font-size:12px}.gc-v3-search-bar{min-height:64px}.gc-v3-next{bottom:24px}}
        @media(max-width:900px){.gc-landing-v2-header{height:78px;padding:15px 14px 8px}.gc-v3-journey{margin-top:-78px}.gc-v3-hero{padding-top:94px}.gc-v3-phase-inner{top:0;min-height:100%}.gc-v2-brand{gap:10px;padding:0}.gc-v2-logo{width:46px;height:46px;border-radius:14px}.gc-v2-wordmark{gap:4px}.gc-v2-wordmark strong{font-size:32px;line-height:.88}.gc-v2-wordmark small{font-size:7px}.gc-v2-actions{gap:7px}.gc-v2-pill{height:42px;min-width:42px}.gc-v2-favorites{width:42px;padding:0}.gc-v2-language{padding:0 10px}.gc-v2-language strong{font-size:11px}.gc-v3-hero .gc-v2-benefits{gap:8px;margin-top:13px}.gc-v3-hero .gc-v2-benefits span{gap:5px;padding:0;font-size:10.5px}.gc-v3-hero .gc-v2-benefits i{width:10px}.gc-v3-scroll-cue{margin-top:16px;padding:6px 12px;gap:8px}.gc-v3-scroll-cue span{padding:0;font-size:16px}.gc-v3-scroll-cue b{width:13px;height:13px}}
        .gc-v3-start{scroll-snap-align:start;scroll-snap-stop:always}
        @media(max-width:900px){.gc-v3-phase-inner{gap:20px;padding:42px 20px 94px}.gc-v3-art{min-height:260px}.gc-v3-message-card{min-height:150px}.gc-v3-next{bottom:36px;width:min(310px,calc(100% - 36px));min-width:0}}
        @media(max-width:640px){
          .gc-v3-hero{padding:90px 0 18px;background:transparent}
          .gc-v3-hero-copy{padding:0 16px}
          .gc-v3-hero h1{max-width:370px;font-size:clamp(21px,6vw,25px);line-height:1.08;letter-spacing:-.035em}
          .gc-v3-hero h1 br{display:none}
          .gc-v3-hero h1 em{display:inline;margin:0 0 0 .18em;letter-spacing:-.025em}
          .gc-v3-hero .gc-v2-benefits{margin-top:15px;margin-bottom:4px}
          .gc-v3-marquee{margin-top:17px;margin-bottom:8px;perspective:820px}
          .gc-v3-marquee-card{--gc-mobile-card-h:clamp(278px,39dvh,330px);--gc-card-panel:94px;height:var(--gc-mobile-card-h);margin-top:calc(var(--gc-mobile-card-h) * -.5);margin-left:calc(var(--gc-mobile-card-h) * -.4);border-radius:18px}
          .gc-v3-marquee-cat{top:10px;left:10px;padding:4px 8px;font-size:8px}
          .gc-v3-marquee-body{padding:9px 8px 8px}.gc-v3-marquee-body strong{min-height:25px;font-size:12px;line-height:1.05}.gc-v3-marquee-body p{margin:2px 0 6px;font-size:12px}.gc-v3-marquee-criteria{gap:3px;font-size:8px}.gc-v3-marquee-criteria span{padding:3px 5px}
          .gc-v3-scroll-cue{margin-top:7px;gap:6px}.gc-v3-scroll-cue:before{height:78px;margin-top:-39px}.gc-v3-scroll-cue span{font-size:14px}.gc-v3-scroll-cue b{width:11px;height:11px}
          .gc-v3-phase-two .gc-v3-phase-inner,.gc-v3-phase-three .gc-v3-phase-inner{padding-top:96px}
        }
        @media(max-width:900px){.gc-v3-start{padding-bottom:82px}.gc-v3-legal{bottom:calc(14px + env(safe-area-inset-bottom));gap:7px;font-size:12px}}        
        @media(max-width:900px){.gc-v2-wordmark{gap:7px}.gc-v2-wordmark strong{line-height:.86}.gc-v2-wordmark small{line-height:1.15}}
        @media(prefers-reduced-motion:reduce){.gc-main.gc-main--flush{scroll-behavior:auto}.gc-v3-hero-glow,.gc-v3-scroll-cue,.gc-v3-scroll-cue span,.gc-v3-scroll-cue b,.gc-v3-next-arrow,.gc-v3-orbit,.gc-v3-search-bar{animation:none!important}.gc-v3-art{transition:none!important}.gc-v3-start-inner{opacity:1!important;transform:none!important}.gc-v3-phase[data-active=true],.gc-v3-phase[data-active=true] *,.gc-v3-phase[data-active=true]:before,.gc-v3-phase[data-active=true]:after,.gc-v3-start[data-active=true],.gc-v3-start[data-active=true] *,.gc-v3-start[data-active=true]:before,.gc-v3-start[data-active=true]:after{animation-duration:.01ms!important;animation-delay:0ms!important;animation-iteration-count:1!important}}
      ` }} />

      <div className="gc-shell" style={{ display:"flex", height:"100vh", overflow:"hidden", background:mobileFlow ? "linear-gradient(155deg,#edf1ec 0%,#f6e9dd 55%,#f3e2d5 100%)" : C.bg, color:C.ink, fontFamily:BODY }}>

        {/* ══ BRAND PANEL ══════════════════════════════════════ */}
        <aside className="gc-brand" style={{ width:"38%", maxWidth:520, background:C.brand, color:"#f3e7d8", padding:"52px 46px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"sticky", top:0, height:"100vh", overflow:"hidden", flexShrink:0 }}>
          <div className="gc-desktop-rail">
            <button type="button" className="gc-desktop-rail-brand" onClick={restart}>
              <span><GiftSVG size={24} fill="#17303e"/></span><strong>Gifty AI</strong>
            </button>
            <div className="gc-desktop-rail-context">
              <small>RICERCA IN CORSO</small>
              <h2>{g.recipientName || "Nuovo regalo"}</h2>
              <p>{[g.occasion, fmtBudget(g.budget, sym)].filter(Boolean).join(" · ")}</p>
            </div>
            <nav className="gc-desktop-rail-steps" aria-label="Fasi della ricerca">
              {["Racconto", "Ricerca AI", "Risultati"].map((label, index) => (
                <div key={label} data-active={desktopStage === index} data-done={desktopStage > index}>
                  <i>{desktopStage > index ? "✓" : String(index + 1).padStart(2, "0")}</i>
                  <span><small>FASE {index + 1}</small><strong>{label}</strong></span>
                </div>
              ))}
            </nav>
            <div className="gc-desktop-rail-foot">
              <span>Gratis · Nessun account · 2 minuti</span>
              <a href="https://www.iubenda.com/privacy-policy/48819018" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              <button type="button" onClick={() => (window as any)._iub?.cs?.api?.openPreferences?.()}>Preferenze cookie</button>
              <button type="button" className="gc-v2-info" onClick={() => setLandingDisclaimerOpen(open => !open)} aria-label="Informazioni su affiliazione Amazon e prezzi">i</button>
              {landingDisclaimerOpen && <div className="gc-v2-disclaimer"><button onClick={() => setLandingDisclaimerOpen(false)}>×</button><span>{tr.disclaimerAmazon}</span><span>{tr.disclaimerPrice}</span></div>}
            </div>
          </div>
          {/* Grain texture */}
          <div style={{ position:"absolute", inset:0, opacity:.5, mixBlendMode:"overlay", pointerEvents:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")" }}/>
          {/* Gold corner ornament */}
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ position:"absolute", top:0, right:0, opacity:.5 }}>
            <path d="M120 0 L120 60 Q120 0 60 0 Z" fill="none"/>
            <circle cx="120" cy="0" r="90" fill="none" stroke="#c9a26b" strokeOpacity=".25" strokeWidth="1"/>
            <circle cx="120" cy="0" r="60" fill="none" stroke="#c9a26b" strokeOpacity=".3" strokeWidth="1"/>
          </svg>
          <div style={{ position:"absolute", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,#c9a26b4d,transparent 70%)", top:-100, right:-110, filter:"blur(2px)" }}/>
          <div style={{ position:"absolute", width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,#e8d5c42e,transparent 70%)", bottom:20, left:-110 }}/>
          {/* Vignette */}
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(120% 90% at 50% 0%,transparent 55%,rgba(0,0,0,.22) 100%)", pointerEvents:"none" }}/>

          {/* Logo */}
          <div className="gc-fade" style={{ display:"flex", alignItems:"center", gap:14, position:"relative" }}>
            <div style={{ width:90, height:90, borderRadius:24, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.4)" }}>
              <GiftSVG size={52} fill="#4a2a16" />
            </div>
            <div>
              <span style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:52, letterSpacing:"-.02em", display:"block", lineHeight:1 }}>Gifty</span>
              <span style={{ fontSize:14, fontWeight:500, letterSpacing:".04em", color:"#d8b98c" }}>AI Gift Concierge</span>
            </div>
          </div>

          {/* Headline */}
          <div className="gc-fade" style={{ position:"relative" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
              <span style={{ width:26, height:1.5, background:"linear-gradient(90deg,#c9a26b,transparent)" }}/>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase" as const, color:"#d8b98c" }}>AI-Powered Gifting</span>
            </div>
            <h1 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:43, lineHeight:1.06, letterSpacing:"-.025em", margin:"0 0 20px", color:"#f8eee0" }}>
              {tr.h1a}<br/>{tr.h1b}
            </h1>
            <p style={{ fontSize:16, lineHeight:1.6, color:"#e3cfb9", maxWidth:340, margin:"0 0 32px" }}>{tr.intro}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[tr.bFree, tr.bBudget, tr.bSocial].map(txt => (
                <div key={txt} style={{ display:"flex", alignItems:"center", gap:12, fontSize:14.5, color:"#f0e3d2" }}>
                  <span style={{ width:24, height:24, borderRadius:"50%", background:"linear-gradient(150deg,#c9a26b40,#c9a26b15)", border:"1px solid #c9a26b55", display:"flex", alignItems:"center", justifyContent:"center", color:"#f0d9a8", flexShrink:0, fontSize:12 }}>✓</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>

          {/* Social proof + locale badge */}
          <div className="gc-fade" style={{ position:"relative", paddingTop:22, borderTop:"1px solid rgba(255,255,255,.12)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:13.5, color:"#d8c4b0", marginBottom:14 }}>
              <div style={{ display:"flex" }}>
                {(["#c9a26b","#e8d5c4","#a8694a"] as const).map((bg, i) => (
                  <span key={i} style={{ width:30, height:30, borderRadius:"50%", background:bg, border:"2.5px solid #5e2e2e", marginLeft:i ? -10 : 0, boxShadow:"0 2px 6px rgba(0,0,0,.25)" }}/>
                ))}
              </div>
              <span>{tr.proofPre} <strong style={{ color:"#fff" }}>42,000+</strong> {tr.proofPost}</span>
            </div>
            <div style={{ fontSize:12.5, color:"#e8d5c4", background:"rgba(0,0,0,.18)", border:"1px solid rgba(255,255,255,.1)", borderRadius:999, padding:"7px 14px", display:"inline-flex", alignItems:"center", gap:6 }}>
              {lang.flag} {lang.code} · {lang.currency} ({lang.sym}) · {lang.country}
            </div>
            <div style={{ marginTop:12 }}>
              <a href="https://www.iubenda.com/privacy-policy/48819018" target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12.5, color:"#d8c4b0", textDecoration:"underline" }}>
                Privacy Policy
              </a>
            </div>
          </div>

          {/* Disclaimer badge — bottom-right corner of the dark panel, hover to reveal */}
          <div style={{ position:"absolute", bottom:18, right:18, zIndex:5 }}>
            <span className="gc-tip">
              <span className="gc-tip-badge" aria-label="Note legali">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c3f3f" aria-hidden="true">
                  <circle cx="12" cy="6.4" r="1.8"/>
                  <rect x="10.3" y="10" width="3.4" height="9.2" rx="1.7"/>
                </svg>
              </span>
              <span className="gc-tip-box">
                <span style={{ display:"block", marginBottom:7 }}>{tr.disclaimerAmazon}</span>
                <span style={{ display:"block" }}>{tr.disclaimerPrice}</span>
              </span>
            </span>
          </div>
        </aside>

        {/* ══ MAIN COLUMN ══════════════════════════════════════ */}
        <main ref={gcMainRef} className={screen === "landing" ? "gc-main gc-main--flush" : `gc-main gc-main--${screen}`} style={{ flex:1, padding:"40px 56px 56px", display:"flex", flexDirection:"column", minWidth:0, position:"relative", overflowY:"auto", overflowX:"hidden", height:"100vh", overscrollBehavior:"contain" }}>

          {/* Top nav */}
          {screen !== "landing" && !mobileFlow && (
          <div className="gc-topnav" style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, marginBottom:18 }}>
            {/* Mobile-only brand mark — .gc-brand (with the full logo) is hidden
                below 900px, so without this the mobile header has no branding
                at all. Shown via CSS only under 900px (see gc-mobile-header). */}
            <button onClick={restart} className="gc-mobile-header" style={{ display:"none", alignItems:"center", gap:10, marginRight:"auto", background:"none", border:"none", padding:0, cursor:"pointer", textAlign:"left" as const }}>
              <div style={{ width:34, height:34, borderRadius:9, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <GiftSVG size={19} fill="#4a2a16" />
              </div>
              <div style={{ display:"flex", flexDirection:"column", lineHeight:1.15 }}>
                <span style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:19, color:C.ink, letterSpacing:"-.01em" }}>Gifty</span>
                <span style={{ fontSize:10.5, fontWeight:600, letterSpacing:".04em", color:C.muted2, textTransform:"uppercase" as const }}>AI Gift Concierge</span>
              </div>
            </button>
            <button type="button" onClick={openFavorites} className="gc-desktop-favorites" aria-label={`Apri ${totalFavoriteCount} preferiti salvati`}>
              <span aria-hidden="true">♡</span> Preferiti {totalFavoriteCount > 0 && <b>{totalFavoriteCount}</b>}
            </button>
            {/* Language menu */}
            <div ref={langMenuRef} style={{ position:"relative" }}>
              <button onClick={() => setLangMenuOpen(v => !v)}
                style={{ padding:"8px 14px", borderRadius:999, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.label, font:`600 13px ${BODY}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                {lang.flag} {lang.code} <span style={{ opacity:.5, fontSize:10 }}>▾</span>
              </button>
              {langMenuOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.1)", overflow:"hidden", minWidth:210, zIndex:30 }}>
                  {LANGS.map((l, i) => (
                    <button key={i} onClick={() => { setLangIdx(i); setLangMenuOpen(false); }}
                      style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", border:"none", background: i === langIdx ? "#fdf6ef" : "#fff", color:C.body, font:`${i===langIdx?600:400} 14px ${BODY}`, cursor:"pointer", textAlign:"left" as const }}>
                      <span style={{ display:"flex", alignItems:"center", gap:10 }}>{l.flag} {l.name}</span>
                      <span style={{ fontSize:12, color:C.muted2 }}>{l.currency}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
          )}

          {/* ══ MOBILE LANDING (mobile-only entry screen; gated to ≤900px both
              via the "landing" screen state — which desktop/tablet never
              enters — and defensively via CSS below 900px) ══ */}
          {screen === "landing" && (
            <div className="gc-landing gc-fade" style={{
              display:"flex", flexDirection:"column",
              padding:"calc(16px + env(safe-area-inset-top)) 20px calc(148px + env(safe-area-inset-bottom))",
              minHeight:"100%",
              background:"linear-gradient(180deg,#5e2e2e 0%,#7c3f3f 32%,#b8836a 58%,#e4d2ba 78%,#f3ebe1 100%)",
            }}>
              <div className="gc-landing-v2">
                <header className="gc-landing-v2-header">
                  <button type="button" className="gc-v2-brand" onClick={restart} aria-label="Gifty, torna all'inizio">
                    <span className="gc-v2-logo"><GiftSVG size={28} fill={N.navy3}/></span>
                    <span className="gc-v2-wordmark"><strong>Gifty AI</strong></span>
                  </button>
                  <div className="gc-v2-actions">
                    <button type="button" onClick={openFavorites} aria-label={`Apri ${totalFavoriteCount} preferiti salvati`} className="gc-v2-pill gc-v2-favorites">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>
                      {totalFavoriteCount > 0 && <span className="gc-v2-favorites-count">{totalFavoriteCount}</span>}
                    </button>
                    <div style={{ position:"relative" }}>
                      <button type="button" onClick={() => setLangMenuOpen(open => !open)} className="gc-v2-pill gc-v2-language">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z"/></svg>
                        <strong>{lang.code}</strong>
                        <svg className="gc-v2-language-chevron" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>
                      </button>
                      {langMenuOpen && (
                        <div className="gc-v2-language-menu">
                          {LANGS.map((language, index) => (
                            <button key={`${language.country}-${index}`} type="button" onClick={() => { setLangIdx(index); setLangMenuOpen(false); }}>
                              <span>{language.flag} {language.name}</span><small>{language.currency}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </header>

                <main className="gc-v3-journey">
                  <section className="gc-v3-hero">
                    <div className="gc-v3-hero-glow" aria-hidden="true"/>
                    <div className="gc-v3-hero-copy">
                      <h1>Parlaci di chi vuoi sorprendere.<br/><em>Gifty troverà il regalo perfetto.</em></h1>
                      <div className="gc-v2-benefits"><span>Gratis</span><i/> <span>Nessun account</span><i/> <span>2 minuti</span></div>
                    </div>

                    <div className="gc-v3-marquee" aria-label="Esempi di regali trovati da Gifty">
                      <div className="gc-v3-marquee-track" ref={heroTrackRef}>
                        {/* Doubled so the arc always has cards queued on both
                            sides — a duplicate sits 8 slots away, far past
                            the edge of the visible fan, so it never shows
                            twice at once. */}
                        {[...GIFT_SHOWCASE, ...GIFT_SHOWCASE].map((item, i) => (
                          <div key={i} className="gc-v3-marquee-card">
                            <img src={item.photo} alt="" loading={i < 4 ? "eager" : "lazy"} decoding="async" />
                            <div className="gc-v3-marquee-fade" />
                            <span className="gc-v3-marquee-cat">{item.category}</span>
                            <div className="gc-v3-marquee-body">
                              <strong>{item.title}</strong>
                              <p>{item.recipient}</p>
                              <div className="gc-v3-marquee-criteria"><span>{item.budget}</span><i/><span>{item.occasion}</span><i/><span>{item.interest}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="button" className="gc-v3-scroll-cue" onClick={() => scrollLandingTo(".gc-v3-phase-one")}><span>Scorri in basso per continuare</span><b aria-hidden="true"/></button>
                  </section>

                  <section className="gc-v3-phase gc-v3-phase-one" data-active={landingActivePhase === 1}>
                    <i className="gc-v3-thread" aria-hidden="true"><b/></i>
                    
                    <div className="gc-v3-phase-inner">
                      <div className="gc-v3-copy"><StepRail active={1} onGo={scrollLandingTo} /><h2>Raccontaci com’è.</h2><p>Scrivi tutto insieme: interessi, abitudini, desideri e cose che non sopporta.</p></div>
                      <div className="gc-v3-art gc-v3-message-art" data-typed={typedCount >= PHASE_ONE_SENTENCE.length}>
                        <div className="gc-v3-message-card">
                          <span className="gc-v3-typed-copy">{PHASE_ONE_SENTENCE.slice(0, typedCount)}<i className="gc-v3-caret" aria-hidden="true"/></span>
                          <i/><i/><i/>
                        </div>
                      </div>
                      <button type="button" className="gc-v3-next" onClick={() => scrollLandingTo(".gc-v3-phase-two")}><strong>Scorri in basso per continuare <i>(1/3)</i></strong><span className="gc-v3-next-arrow">↓</span></button>
                    </div>
                  </section>

                  <section className="gc-v3-phase gc-v3-phase-two" data-active={landingActivePhase === 2}>
                    <i className="gc-v3-thread" aria-hidden="true"><b/></i>
                    
                    <div className="gc-v3-phase-inner gc-v3-reverse">
                      <div className="gc-v3-copy"><StepRail active={2} onGo={scrollLandingTo} /><h2>Gifty AI collega gli indizi.</h2><p>Trasforma ciò che racconti in insight utili e li confronta con migliaia di idee regalo.</p></div>
                      <div className="gc-v3-art gc-v3-ai-canvas" aria-label="Gifty AI collega gli indizi e identifica i criteri più utili">
                        <svg className="gc-v3-ai-routes" viewBox="0 0 520 330" preserveAspectRatio="none" aria-hidden="true">
                          <path d="M108 72 C190 72 183 150 252 162"/>
                          <path d="M92 160 C165 160 190 162 252 162"/>
                          <path d="M108 250 C190 250 183 175 252 162"/>
                          <path d="M270 162 C345 150 345 76 420 76"/>
                          <path d="M270 162 C350 162 350 162 438 162"/>
                          <path d="M270 162 C345 178 345 250 420 250"/>
                        </svg>
                        <div className="gc-v3-ai-count"><i/>{analysedCount.toLocaleString("it-IT")} idee confrontate</div>
                        <div className="gc-v3-ai-clues" aria-hidden="true">
                          <small>INDIZI</small>
                          {ENGINE_TOKENS.slice(0, 3).map(token => <span key={token.label}>{token.label}</span>)}
                        </div>
                        <div className="gc-v3-ai-orb" aria-hidden="true">
                          <i/><i/><i/>
                          <span>✦</span><b>Gifty AI</b><small>COLLEGA</small>
                        </div>
                        <div className="gc-v3-ai-findings" aria-hidden="true">
                          <small>CRITERI RILEVATI</small>
                          {ENGINE_RESULTS.slice(0, 3).map(result => <span key={result.label}><i/>{result.label}<b>{result.score}%</b></span>)}
                        </div>
                      </div>
                      <button type="button" className="gc-v3-next" onClick={() => scrollLandingTo(".gc-v3-phase-three")}><strong>Scorri in basso per continuare <i>(2/3)</i></strong><span className="gc-v3-next-arrow">↓</span></button>
                    </div>
                  </section>

                  <section className="gc-v3-phase gc-v3-phase-three" data-active={landingActivePhase === 3}>
                    <i className="gc-v3-thread" aria-hidden="true"><b/></i>
                    
                    <div className="gc-v3-phase-inner">
                      <div className="gc-v3-copy"><StepRail active={3} onGo={scrollLandingTo} /><h2>Scegli il regalo giusto.</h2><p>Ricevi proposte acquistabili direttamente su Amazon. Salva, scarta o rifinisci ogni singola idea.</p></div>
                      {/* Real gift cards, same anatomy as the hero carousel —
                          the results you get should look like the results we
                          promised on the way in. */}
                      <div className="gc-v3-art gc-v3-result-art">
                        {RESULT_PREVIEW.map((item, i) => (
                          <article key={item.title}>
                            {/* Not lazy: these three enter from scale(.08),
                                so a lazy loader can decide they're too small
                                to be "in view" and never fetch them. */}
                            <img src={item.photo} alt="" decoding="async" />
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <div className="gc-v3-result-body">
                              <strong>{item.title}</strong>
                              <div className="gc-v3-result-criteria"><span>{item.budget}</span><span>{item.interest}</span></div>
                            </div>
                          </article>
                        ))}
                      </div>
                      <button type="button" className="gc-v3-next" onClick={() => scrollLandingTo(".gc-v3-start")}><strong>Scorri in basso per continuare <i>(3/3)</i></strong><span className="gc-v3-next-arrow">↓</span></button>
                    </div>
                  </section>

                  <section className="gc-v3-start" data-active={landingActivePhase === 4}>
                    <div className="gc-v3-start-inner">
                      {/* The thread arrives here and the parcel it has been
                          leading to opens: lid off, box springs, contents up. */}
                      <span className="gc-v3-parcel" aria-hidden="true">
                        <i className="gc-v3-parcel-thread"><b/></i>
                        <i className="gc-v3-parcel-burst"/>
                        <i className="gc-v3-parcel-lid"><b/></i>
                        <i className="gc-v3-parcel-box"><b/><em><GiftSVG size={26} fill={N.navy3}/></em></i>
                        {/* Indexed explicitly rather than by nth-of-type: adding
                            the thread above once shifted every confetti piece by
                            one and left the last with no trajectory at all. */}
                        {Array.from({ length: 14 }, (_, n) => (
                          <i key={n} className="gc-v3-parcel-bit" data-bit={n} />
                        ))}
                      </span>
                      <p>ORA TOCCA A TE</p><h2>Inizia la ricerca.</h2>
                      <span className="gc-v3-start-sub">Partiamo da Nome, Occasione e Budget.</span>
                      <button type="button" className="gc-v3-search-bar" onClick={() => { setLandingSheetOpen(true); setLandingBarFocused(true); }}>
                        <span aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span><strong>{g.recipientName || landingForm.nameLabel}</strong><b>›</b>
                      </button>
                    </div>
                    {/* What comes out of the box: real ideas, one after the
                        other, landing along the foot of the screen. */}
                    <div className="gc-v3-pops" aria-hidden="true">
                      {PARCEL_POPS.map((item, i) => (
                        <span key={item.title} className="gc-v3-pop" data-slot={i}>
                          <img src={item.photo} alt="" decoding="async" />
                          <b>{item.title}</b>
                        </span>
                      ))}
                    </div>
                    <div className="gc-v3-legal">
                      <a href="https://www.iubenda.com/privacy-policy/48819018" target="_blank" rel="noopener noreferrer">Privacy Policy</a><span>·</span><button onClick={() => (window as any)._iub?.cs?.api?.openPreferences?.()}>Preferenze cookie</button>
                      <button className="gc-v2-info" onClick={() => setLandingDisclaimerOpen(open => !open)} aria-label="Note legali">i</button>
                      {landingDisclaimerOpen && <div className="gc-v2-disclaimer"><button onClick={() => setLandingDisclaimerOpen(false)}>×</button><span>{tr.disclaimerAmazon}</span><span>{tr.disclaimerPrice}</span></div>}
                    </div>
                  </section>
                </main>
              </div>
              <div className="gc-landing-legacy" aria-hidden="true">
              {/* Top row: icon badge + language pill */}
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                <div style={{ width:34, height:34, marginRight:"auto", borderRadius:10, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <GiftSVG size={18} fill="#4a2a16" />
                </div>
                <button type="button" onClick={openFavorites} aria-label={`Apri ${totalFavoriteCount} preferiti salvati`}
                  style={{ minWidth:37, height:35, padding:"0 9px", borderRadius:999, border:"1px solid rgba(255,255,255,.3)", background:"rgba(0,0,0,.15)", color:"#f0e3d2", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  <span aria-hidden="true">♡</span>{totalFavoriteCount || ""}
                </button>
                <div ref={langMenuRef} style={{ position:"relative" }}>
                  <button onClick={() => setLangMenuOpen(v => !v)}
                    style={{ padding:"8px 14px", borderRadius:999, border:"1px solid rgba(255,255,255,.3)", background:"rgba(0,0,0,.15)", color:"#f0e3d2", font:`600 13px ${BODY}`, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    {lang.flag} {lang.code} <span style={{ opacity:.5, fontSize:10 }}>▾</span>
                  </button>
                  {langMenuOpen && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, background:"#fff", border:`1.5px solid ${C.border}`, borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.1)", overflow:"hidden", minWidth:200, zIndex:30 }}>
                      {LANGS.map((l, i) => (
                        <button key={i} onClick={() => { setLangIdx(i); setLangMenuOpen(false); }}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"11px 16px", border:"none", background: i === langIdx ? "#fdf6ef" : "#fff", color:C.body, font:`${i===langIdx?600:400} 14px ${BODY}`, cursor:"pointer", textAlign:"left" as const }}>
                          <span style={{ display:"flex", alignItems:"center", gap:10 }}>{l.flag} {l.name}</span>
                          <span style={{ fontSize:12, color:C.muted2 }}>{l.currency}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Title block */}
              <div style={{ textAlign:"center", marginBottom:4 }}>
                <div style={{ fontFamily:"var(--font-bricolage)", fontWeight:800, fontSize:48, color:"#f8eee0", letterSpacing:"-.02em", marginBottom:0, lineHeight:1 }}>Gifty</div>
                <div style={{ fontFamily:"var(--font-bricolage)", fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase" as const, color:"#f0d9a8", marginTop:6, marginBottom:10 }}>{tr.landingKicker}</div>
                <div style={{ width:"min(330px,100%)", margin:"0 auto 10px", padding:"10px 16px", textAlign:"center", border:"1px solid rgba(255,245,224,.24)", borderRadius:15, background:"linear-gradient(135deg,rgba(255,250,240,.14),rgba(255,255,255,.06))", boxShadow:"inset 0 1px 0 rgba(255,255,255,.14),0 7px 22px rgba(55,23,28,.12)", backdropFilter:"blur(8px)" }}>
                  <p style={{ fontWeight:500, color:"#fff1df", margin:0, fontSize:14, lineHeight:1.32, textShadow:"0 1px 8px rgba(45,20,22,.25)" }}>{tr.landingSub}</p>
                </div>
              </div>

              {/* How it works — animated 3-scene stage (design handoff:
                  design_handoff_3step_animation). Scenes cross-fade on a 9s
                  loop (3s per step), each with its own SVG micro-animation,
                  plus a dot-stepper below showing the active step. Pure CSS
                  — no JS timers/measurement needed. */}
              <div style={{ position:"relative", height:178, marginTop:8, marginBottom:12 }}>
                <div className="gc-stage-scene" style={{ animationDelay:"0s" }}>
                  <div style={{ position:"relative", width:150, height:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="150" height="100" viewBox="0 0 150 100" fill="none">
                      <defs>
                        <linearGradient id="gcProfileGlass" x1="34" y1="12" x2="117" y2="88"><stop stopColor="#fffaf0"/><stop offset=".45" stopColor="#f0dbc0"/><stop offset="1" stopColor="#c99a77"/></linearGradient>
                        <linearGradient id="gcPortraitBg" x1="38" y1="22" x2="75" y2="71"><stop stopColor="#d8b1cf"/><stop offset=".5" stopColor="#a76f92"/><stop offset="1" stopColor="#633d5f"/></linearGradient>
                        <linearGradient id="gcPortraitTop" x1="50" y1="49" x2="67" y2="72"><stop stopColor="#a7cbb8"/><stop offset="1" stopColor="#5e8f81"/></linearGradient>
                        <filter id="gcProfileShadow"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#291321" floodOpacity=".42"/></filter>
                        <filter id="gcProfileBlur"><feGaussianBlur stdDeviation="7"/></filter>
                        <clipPath id="gcPortraitClip"><rect x="38" y="21" width="39" height="50" rx="13"/></clipPath>
                      </defs>
                      <ellipse cx="75" cy="54" rx="58" ry="31" fill="#e9ba8c" fillOpacity=".18" filter="url(#gcProfileBlur)"/>
                      <g style={{ transformOrigin:"75px 50px" }}>
                        <rect x="18" y="20" width="101" height="65" rx="17" fill="#6f4058" fillOpacity=".38" transform="rotate(-7 18 20)"/>
                        <rect x="27" y="12" width="101" height="70" rx="18" fill="#be7d73" fillOpacity=".42" transform="rotate(5 27 12)"/>
                        <g className="gc-stage-profile" filter="url(#gcProfileShadow)" style={{ transformOrigin:"76px 51px" }}>
                          <rect x="29" y="14" width="94" height="72" rx="18" fill="url(#gcProfileGlass)" stroke="#fff8e9" strokeOpacity=".75"/>
                          <path d="M38 20h76" stroke="#fff" strokeOpacity=".38" strokeLinecap="round"/>
                          <g clipPath="url(#gcPortraitClip)">
                            <rect x="38" y="21" width="39" height="50" fill="url(#gcPortraitBg)"/>
                            <circle cx="58" cy="43" r="10" fill="#f2c6aa"/>
                            <path d="M47 43c0-13 5-18 12-18 8 0 12 7 11 18-2-7-6-10-12-10-5 0-8 3-11 10Z" fill="#4a293d"/>
                            <path d="M45 72c1-14 7-20 14-20s14 6 16 20" fill="url(#gcPortraitTop)"/>
                            <path d="M53 44c1.7 1.7 7.2 1.7 9 0" stroke="#b36d66" strokeWidth="1.2" strokeLinecap="round"/>
                            <circle cx="54" cy="40" r="1" fill="#543241"/><circle cx="62" cy="40" r="1" fill="#543241"/>
                          </g>
                          <rect x="84" y="26" width="27" height="4" rx="2" fill="#75475b"/>
                          <rect x="84" y="34" width="20" height="3" rx="1.5" fill="#b88578"/>
                          <g transform="translate(83 48)"><rect width="30" height="10" rx="5" fill="#8ebaa5"/><circle cx="7" cy="5" r="2" fill="#eff7ed"/><rect x="12" y="3.5" width="12" height="3" rx="1.5" fill="#eff7ed" fillOpacity=".75"/></g>
                          <g transform="translate(83 62)"><rect width="25" height="10" rx="5" fill="#b7a2d5"/><path d="M6 7 8 3l2 4H6Z" fill="#f8f0ff"/><rect x="13" y="3.5" width="7" height="3" rx="1.5" fill="#f8f0ff" fillOpacity=".75"/></g>
                        </g>
                      </g>
                      <g className="gc-stage-bubble" filter="url(#gcProfileShadow)" style={{ transformOrigin:"124px 24px" }}>
                        <rect x="110" y="7" width="35" height="29" rx="11" fill="#fffaf1" stroke="#e5c498"/>
                        <path d="M117 35l-2 7 8-7" fill="#fffaf1" stroke="#e5c498" strokeLinejoin="round"/>
                        <circle className="gc-stage-typing-dot" cx="119" cy="21" r="2" fill="#8f4e68" style={{ animationDelay:"0s", transformOrigin:"119px 21px" }}/>
                        <circle className="gc-stage-typing-dot" cx="127" cy="21" r="2" fill="#ca786d" style={{ animationDelay:".15s", transformOrigin:"127px 21px" }}/>
                        <circle className="gc-stage-typing-dot" cx="135" cy="21" r="2" fill="#d5a966" style={{ animationDelay:".3s", transformOrigin:"135px 21px" }}/>
                      </g>
                      <g className="gc-stage-chip" style={{ transformOrigin:"125px 69px", animationDelay:".18s" }}>
                        <circle cx="125" cy="69" r="11" fill="#cf766f" stroke="#f6d4bb" strokeWidth="1.2"/><path d="M125 74s-6-3.8-6-7.3c0-3.2 4.3-4.1 6-1.4 1.7-2.7 6-1.8 6 1.4 0 3.5-6 7.3-6 7.3Z" fill="#fff8eb"/>
                      </g>
                    </svg>
                  </div>
                  <div style={{ fontSize:15.5, color:"#fff0d4", fontWeight:700, textAlign:"center", maxWidth:310, lineHeight:1.28, letterSpacing:".005em", textShadow:"0 1px 8px rgba(45,20,22,.28)" }}>{tr.stepCaption1}</div>
                </div>

                <div className="gc-stage-scene" style={{ opacity:0, animationDelay:"3s" }}>
                  <div style={{ position:"relative", width:150, height:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="150" height="100" viewBox="0 0 150 100" fill="none" style={{ overflow:"visible" }}>
                      <defs>
                        <radialGradient id="gcAiAura"><stop stopColor="#f4d497" stopOpacity=".62"/><stop offset=".55" stopColor="#bd7e86" stopOpacity=".18"/><stop offset="1" stopColor="#6d3c59" stopOpacity="0"/></radialGradient>
                        <linearGradient id="gcAiGlass" x1="51" y1="22" x2="100" y2="79"><stop stopColor="#fff1d1" stopOpacity=".9"/><stop offset=".38" stopColor="#d28c8a" stopOpacity=".88"/><stop offset="1" stopColor="#704265" stopOpacity=".95"/></linearGradient>
                        <linearGradient id="gcFacetA" x1="58" y1="30" x2="84" y2="68"><stop stopColor="#fff5d7"/><stop offset="1" stopColor="#d9a45f"/></linearGradient>
                        <linearGradient id="gcFacetB" x1="78" y1="31" x2="94" y2="67"><stop stopColor="#e59a8b"/><stop offset="1" stopColor="#98506f"/></linearGradient>
                        <filter id="gcAiShadow"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#1f0e1d" floodOpacity=".48"/></filter>
                        <filter id="gcAiBlur"><feGaussianBlur stdDeviation="8"/></filter>
                        <clipPath id="gcAiLens"><circle cx="75" cy="50" r="28"/></clipPath>
                      </defs>
                      <ellipse cx="75" cy="52" rx="57" ry="35" fill="url(#gcAiAura)" filter="url(#gcAiBlur)"/>
                      <path className="gc-stage-signal" d="M75 50C56 24 38 20 22 29M75 50C95 24 113 22 132 32M75 50C99 68 114 74 132 67M75 50C53 70 36 75 18 65" stroke="#e7bd84" strokeWidth="1.15" strokeDasharray="5 4"/>
                      <g className="gc-stage-orbit" style={{ transformOrigin:"75px 50px" }}>
                        <g transform="translate(12 18) rotate(-7)"><rect width="31" height="24" rx="7" fill="#f5e9d2" stroke="#fff8e8"/><path d="M4 18 11 10l5 5 4-5 7 8H4Z" fill="#80a995"/><circle cx="23" cy="7" r="3" fill="#dca66d"/></g>
                        <g transform="translate(112 18) rotate(8)"><rect width="27" height="25" rx="7" fill="#d7c7e7" stroke="#fff" strokeOpacity=".7"/><ellipse cx="13.5" cy="15" rx="7" ry="5" fill="#7c536f"/><path d="M9 8h9M11 5h5v4" stroke="#fff3e0" strokeWidth="1.3"/></g>
                        <g transform="translate(113 62) rotate(-6)"><rect width="29" height="23" rx="7" fill="#e9ad9f" stroke="#ffd8c9"/><path d="M7 17c3-9 10-9 14 0M14 7v10" stroke="#fff5e7" strokeWidth="1.5" strokeLinecap="round"/></g>
                        <g transform="translate(9 61) rotate(7)"><rect width="31" height="23" rx="7" fill="#a7c9b6" stroke="#dff1e8"/><path d="M7 16c4-8 8-8 12 0M20 7h5v9h-5z" stroke="#fff9e9" strokeWidth="1.4"/></g>
                      </g>
                      <g className="gc-stage-core" filter="url(#gcAiShadow)" style={{ transformOrigin:"75px 50px" }}>
                        <circle cx="75" cy="50" r="31" fill="#6e405f" fillOpacity=".42" stroke="#f4d7a4" strokeOpacity=".65"/>
                        <circle cx="75" cy="50" r="27" fill="url(#gcAiGlass)" stroke="#fff4d9" strokeOpacity=".7"/>
                        <g clipPath="url(#gcAiLens)">
                          <path className="gc-stage-facet" d="M75 27 92 40 86 66 75 73 58 61 57 39 75 27Z" fill="url(#gcFacetA)"/>
                          <path d="m75 27 17 13-17 10-18-11 18-12Z" fill="#fff3cc" fillOpacity=".72"/>
                          <path d="m75 50 17-10-6 26-11 7V50Z" fill="url(#gcFacetB)"/>
                          <path d="m75 50-18-11 1 22 17 12V50Z" fill="#c56f78"/>
                          <path d="m75 27 4 18-4 5-5-6 5-17Z" fill="#fff9e7" fillOpacity=".88"/>
                          <rect className="gc-stage-scan" x="45" y="35" width="60" height="2" rx="1" fill="#fff7d7" filter="url(#gcAiBlur)"/>
                          <rect className="gc-stage-scan" x="46" y="35" width="58" height="1.2" rx="1" fill="#fffdf1"/>
                        </g>
                      </g>
                      <path className="gc-stage-spark" d="M112 7v10M107 12h10" stroke="#f4d8a8" strokeWidth="2" strokeLinecap="round" style={{ transformOrigin:"112px 12px" }}/>
                      <path className="gc-stage-spark" d="M41 8v7M37.5 11.5h7" stroke="#d99085" strokeWidth="1.7" strokeLinecap="round" style={{ transformOrigin:"41px 11.5px", animationDelay:".45s" }}/>
                      <circle className="gc-stage-spark" cx="133" cy="52" r="2.5" fill="#a9d1ba" style={{ transformOrigin:"133px 52px", animationDelay:".7s" }}/>
                    </svg>
                  </div>
                  <div style={{ fontSize:15.5, color:"#fff0d4", fontWeight:700, textAlign:"center", maxWidth:310, lineHeight:1.28, letterSpacing:".005em", textShadow:"0 1px 8px rgba(45,20,22,.28)" }}>{tr.stepCaption2}</div>
                </div>

                <div className="gc-stage-scene" style={{ opacity:0, animationDelay:"6s" }}>
                  <div style={{ position:"relative", width:150, height:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="150" height="100" viewBox="0 0 150 100" fill="none">
                      <defs>
                        <linearGradient id="gcGiftFront" x1="48" y1="54" x2="94" y2="91"><stop stopColor="#edc57e"/><stop offset="1" stopColor="#b8764f"/></linearGradient>
                        <linearGradient id="gcGiftSide" x1="94" y1="54" x2="118" y2="82"><stop stopColor="#c68b57"/><stop offset="1" stopColor="#845044"/></linearGradient>
                        <linearGradient id="gcGiftTop" x1="44" y1="47" x2="108" y2="63"><stop stopColor="#f8dc9c"/><stop offset="1" stopColor="#d3975c"/></linearGradient>
                        <linearGradient id="gcGiftRibbon" x1="70" y1="43" x2="84" y2="91"><stop stopColor="#d98279"/><stop offset="1" stopColor="#7e4262"/></linearGradient>
                        <linearGradient id="gcProductCard" x1="50" y1="14" x2="101" y2="65"><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#e9d2b5"/></linearGradient>
                        <filter id="gcGiftShadow"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#1d0d1b" floodOpacity=".48"/></filter>
                        <filter id="gcGiftBlur"><feGaussianBlur stdDeviation="7"/></filter>
                      </defs>
                      <ellipse cx="78" cy="73" rx="57" ry="22" fill="#eac38b" fillOpacity=".24" filter="url(#gcGiftBlur)"/>
                      <g className="gc-stage-confetti" style={{ transformOrigin:"31px 31px" }}><path d="M25 35c8-2 3-10 11-12" stroke="#8fc6aa" strokeWidth="3" strokeLinecap="round"/></g>
                      <g className="gc-stage-confetti" style={{ transformOrigin:"122px 27px", animationDelay:".16s" }}><rect x="119" y="24" width="7" height="4" rx="1" fill="#b7a2d5" transform="rotate(34 119 24)"/></g>
                      <g className="gc-stage-confetti" style={{ transformOrigin:"134px 51px", animationDelay:".32s" }}><circle cx="134" cy="51" r="3" fill="#dc887b"/></g>
                      <g className="gc-stage-confetti" style={{ transformOrigin:"18px 57px", animationDelay:".48s" }}><path d="m14 58 8-5" stroke="#e4b96f" strokeWidth="3.2" strokeLinecap="round"/></g>
                      <g className="gc-stage-card-reveal" filter="url(#gcGiftShadow)" style={{ transformOrigin:"76px 46px" }}>
                        <rect x="47" y="8" width="58" height="57" rx="12" fill="url(#gcProductCard)" stroke="#fff8e9"/>
                        <rect x="53" y="14" width="46" height="27" rx="8" fill="#a8c4b0"/>
                        <path d="M53 35 65 23l9 8 7-9 18 19H53v-6Z" fill="#557e70"/>
                        <circle cx="89" cy="21" r="4" fill="#f2d68f"/>
                        <rect x="54" y="47" width="30" height="4" rx="2" fill="#75475b"/>
                        <rect x="54" y="55" width="20" height="3" rx="1.5" fill="#ba8e76"/>
                        <circle cx="94" cy="52" r="6" fill="#cf766f"/><path d="m91 52 2 2 4-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </g>
                      <g className="gc-stage-gift" filter="url(#gcGiftShadow)" style={{ transformOrigin:"78px 72px" }}>
                        <path d="M41 54 92 57v35L41 86V54Z" fill="url(#gcGiftFront)"/>
                        <path d="m92 57 25-11v34L92 92V57Z" fill="url(#gcGiftSide)"/>
                        <path d="m41 54 25-12 51 4-25 11-51-3Z" fill="url(#gcGiftTop)"/>
                        <path d="m70 44 14 1 9 12-14-1-9-12Z" fill="#b45f70"/>
                        <path d="M70 56 84 57v34l-14-2V56Z" fill="url(#gcGiftRibbon)"/>
                        <path d="m84 57 8-3v35l-8 2V57Z" fill="#7f4262"/>
                        <path d="M45 60 88 63" stroke="#fff0c8" strokeOpacity=".42" strokeLinecap="round"/>
                      </g>
                      <g className="gc-stage-lid" filter="url(#gcGiftShadow)" style={{ transformOrigin:"79px 51px" }}>
                        <path d="m36 48 29-13 58 5-29 13-58-5Z" fill="#f2d28f"/>
                        <path d="m36 48 58 5v9l-58-6v-8Z" fill="#cf985c"/>
                        <path d="m94 53 29-13v8L94 62v-9Z" fill="#a96e4f"/>
                        <path d="m68 36 15 1 12 15-15-1-12-15Z" fill="#c36f75"/>
                        <path d="M79 36c-8-8-18-8-18-2 0 5 10 7 18 7m0-5c8-8 18-7 18-1 0 5-10 6-18 6" stroke="#d98279" strokeWidth="4" strokeLinecap="round"/>
                      </g>
                      <path className="gc-stage-spark" d="M116 8v11M110.5 13.5h11" stroke="#f0d9a8" strokeWidth="2.2" strokeLinecap="round" style={{ transformOrigin:"116px 13.5px", animationDelay:".2s" }}/>
                      <path className="gc-stage-spark" d="M37 10v8M33 14h8" stroke="#d88976" strokeWidth="1.8" strokeLinecap="round" style={{ transformOrigin:"37px 14px", animationDelay:".55s" }}/>
                    </svg>
                  </div>
                  <div style={{ fontSize:15.5, color:"#fff0d4", fontWeight:700, textAlign:"center", maxWidth:310, lineHeight:1.28, letterSpacing:".005em", textShadow:"0 1px 8px rgba(45,20,22,.28)" }}>{tr.stepCaption3}</div>
                </div>
              </div>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:20 }}>
                <div className="gc-stage-dot" style={{ animationDelay:"0s" }}/>
                <div style={{ width:16, height:1.5, background:"rgba(255,255,255,.25)", overflow:"hidden" }}><div className="gc-stage-line-fill"/></div>
                <div className="gc-stage-dot" style={{ animationDelay:"3s" }}/>
                <div style={{ width:16, height:1.5, background:"rgba(255,255,255,.25)", overflow:"hidden" }}><div className="gc-stage-line-fill"/></div>
                <div className="gc-stage-dot" style={{ animationDelay:"6s" }}/>
              </div>

              <div style={{ marginTop:"auto", paddingTop:18 }}>
                <div style={{ textAlign:"center", marginBottom:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:".03em", color:"#f0d9a8", background:"rgba(0,0,0,.14)", border:"1px solid rgba(255,255,255,.15)", borderRadius:999, padding:"7px 14px", display:"inline-block" }}>{tr.landingBadge}</span>
                </div>

              {/* Legal footer: privacy policy link + a tap-to-open disclaimer
                  badge (not covered by the design handoff — added per
                  explicit request; touch-friendly since hover doesn't exist
                  on mobile). marginTop:"auto" (the landing container is a
                  flex column) pins this just above the reserved bottom-bar
                  padding on any screen height, instead of a fixed pixel
                  offset that left a growing gap on taller phones. */}
              <div style={{ textAlign:"center", position:"relative" }}>
                <a href="https://www.iubenda.com/privacy-policy/48819018" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:12.5, color:"#6b5b4d", textDecoration:"underline" }}>
                  Privacy Policy
                </a>
                <span style={{ fontSize:12.5, color:"#b3a292", margin:"0 6px" }}>·</span>
                <button onClick={() => (window as any)._iub?.cs?.api?.openPreferences?.()}
                  style={{ fontFamily:BODY, fontSize:12.5, color:"#6b5b4d", textDecoration:"underline", background:"none", border:"none", padding:0, cursor:"pointer" }}>
                  Preferenze cookie
                </button>
                <button onClick={() => setLandingDisclaimerOpen(v => !v)} aria-label="Note legali"
                  style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, marginLeft:8, verticalAlign:"middle", borderRadius:"50%", border:`1px solid ${C.bord5}`, background:"#fff", cursor:"pointer", padding:0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#7c3f3f" aria-hidden="true">
                    <circle cx="12" cy="6.4" r="1.8"/>
                    <rect x="10.3" y="10" width="3.4" height="9.2" rx="1.7"/>
                  </svg>
                </button>
                {landingDisclaimerOpen && (
                  <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", bottom:"calc(100% + 10px)", width:260, maxWidth:"calc(100vw - 40px)", background:"#fff", border:"1px solid #ece0d2", borderRadius:14, padding:"14px 16px", textAlign:"left" as const, fontSize:11.5, lineHeight:1.5, color:"#3a2e26", boxShadow:"0 12px 32px rgba(0,0,0,.18)", zIndex:25 }}>
                    <button onClick={() => setLandingDisclaimerOpen(false)} aria-label="Chiudi"
                      style={{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:"50%", border:"none", background:C.bg, color:C.muted, fontSize:14, lineHeight:1, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      ×
                    </button>
                    <span style={{ display:"block", marginBottom:7, paddingRight:16 }}>{tr.disclaimerAmazon}</span>
                    <span style={{ display:"block" }}>{tr.disclaimerPrice}</span>
                  </div>
                )}
              </div>
              </div>
              </div>
            </div>
          )}

          {/* Fixed bottom action bar — rendered via portal straight into
              <body>, outside .gc-main's internal scroll container. iOS
              Safari notoriously mispositions/drags position:fixed elements
              nested inside a custom overflow:auto scroller (here .gc-main),
              so we sidestep that entirely rather than fight it. */}
          {screen === "landing" && hasMounted && landingSheetOpen && createPortal(
            (() => {
              const submitLandingAnswer = () => {
                if (!g.recipientName.trim() || !g.occasion?.trim()) return;
                (document.activeElement as HTMLElement | null)?.blur();
                setG(previous => ({ ...previous, recipientName:normalizeRecipientName(previous.recipientName.trim(), lang.t) }));
                setActiveSearchId(`favorite-search-${Date.now()}`);
                setFavoriteGifts([]);
                setLandingSheetOpen(false);
                setLandingBarFocused(false);
                setMobileFlow(true);
                setScreen("clues");
              };
              return (
                <>
                  {landingSheetOpen && (
                    <button
                      type="button"
                      aria-label="Chiudi il pannello"
                      onClick={() => { setLandingSheetOpen(false); setLandingBarFocused(false); }}
                      style={{ position:"fixed", inset:0, zIndex:190, border:"none", background:"rgba(9,29,40,.28)", backdropFilter:"blur(2px)", cursor:"default" }}
                    />
                  )}
                  <div
                    className="gc-landing-sheet"
                    style={{
                      position:"fixed", left:0, right:0, bottom:0,
                      height: landingSheetOpen ? "min(56dvh,470px)" : "auto",
                      overflow:"hidden",
                      background:"#e9dcc9",
                      borderRadius: landingSheetOpen ? "30px 30px 0 0" : "26px 26px 0 0",
                      boxShadow: landingSheetOpen ? "0 -18px 42px rgba(55,28,22,.24)" : "0 -10px 24px rgba(0,0,0,.15)",
                      padding: landingSheetOpen ? "10px 17px calc(18px + env(safe-area-inset-bottom))" : "13px 16px calc(20px + env(safe-area-inset-bottom))",
                      zIndex:200,
                    }}>
                    {!landingSheetOpen ? (
                      <>
                        <div className="gc-start-cue" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontSize:14, fontWeight:800, letterSpacing:".04em", color:N.navy, marginBottom:12 }}>
                          <span>{landingForm.collapsedPrompt}</span>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div className={`gc-start-bar ${landingBarFocused ? "" : "gc-bar-pulse"}`} style={{ width:"100%", display:"flex", alignItems:"center", gap:11, background:"#fffdf9", border:"2.5px solid #b98645", borderRadius:999, padding:"9px 15px 9px 10px", boxShadow: landingBarFocused ? "0 0 0 7px rgba(201,162,107,.3), 0 12px 30px rgba(124,63,63,.3)" : "0 0 0 5px rgba(201,162,107,.32), 0 10px 26px rgba(124,63,63,.28)", transition:"box-shadow .3s cubic-bezier(.4,0,.2,1)" }}>
                          <span aria-hidden="true" style={{ width:38, height:38, display:"grid", placeItems:"center", flexShrink:0, borderRadius:"50%", color:"#fff8ea", background:"linear-gradient(145deg,#294b59,#203746)", boxShadow:"0 4px 10px rgba(9,29,40,.24)" }}>
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </span>
                          <input
                            type="text" readOnly autoComplete="off" name="gc-landing-recipient-closed"
                            value={g.recipientName}
                            onClick={() => { setLandingSheetOpen(true); setLandingBarFocused(true); }}
                            onFocus={() => { setLandingSheetOpen(true); setLandingBarFocused(true); }}
                            placeholder={landingForm.nameLabel}
                            style={{ position:"relative", zIndex:1, flex:1, minWidth:0, border:"none", outline:"none", background:"transparent", fontSize:16, fontFamily:BODY, fontWeight:600, color:C.ink, cursor:"text" }}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
                        <button type="button" className="gc-landing-sheet-handle" aria-label="Riduci il pannello" onClick={() => { setLandingSheetOpen(false); setLandingBarFocused(false); }} style={{ border:"none", padding:0, cursor:"pointer" }}/>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14, marginBottom:12 }}>
                          <div>
                            <div style={{ fontFamily:DISPLAY, fontSize:22, fontWeight:700, letterSpacing:"-.02em", color:C.ink, lineHeight:1.08 }}>{landingForm.sheetTitle}</div>
                            <div style={{ marginTop:4, fontSize:12.5, lineHeight:1.35, color:C.muted4 }}>{landingForm.sheetSub}</div>
                          </div>
                          <button type="button" onClick={() => { setLandingSheetOpen(false); setLandingBarFocused(false); }} aria-label="Chiudi"
                            style={{ width:30, height:30, flexShrink:0, padding:0, border:`1px solid ${C.bord5}`, borderRadius:"50%", background:"rgba(255,255,255,.55)", color:C.maroon, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                          </button>
                        </div>

                        <div style={{ display:"grid", gap:8 }}>
                          <div className="gc-landing-sheet-field">
                            <span aria-hidden="true" style={{ width:30, height:30, display:"grid", placeItems:"center", flexShrink:0, borderRadius:9, color:C.maroon, background:"#f2e5d5" }}>
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            </span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <label htmlFor="gc-landing-recipient">{landingForm.nameLabel}</label>
                              <input id="gc-landing-recipient" autoFocus type="text" autoComplete="off" value={g.recipientName} onChange={e => setG(p => ({ ...p, recipientName:normalizeRecipientName(e.target.value, lang.t) }))} placeholder={landingForm.namePlaceholder}/>
                            </div>
                          </div>

                          <div className="gc-landing-sheet-field">
                            <span aria-hidden="true" style={{ width:30, height:30, display:"grid", placeItems:"center", flexShrink:0, borderRadius:9, color:C.maroon, background:"#f2e5d5" }}>
                              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 7H8.7a2.2 2.2 0 1 1 2.2-2.2L12 7Zm0 0h3.3a2.2 2.2 0 1 0-2.2-2.2L12 7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
                            </span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <label htmlFor="gc-landing-occasion">{landingForm.occasionLabel}</label>
                              <input id="gc-landing-occasion" type="text" autoComplete="off" value={g.occasion ?? ""} onChange={e => setG(p => ({ ...p, occasion:e.target.value }))} placeholder={landingForm.occasionPlaceholder}/>
                            </div>
                          </div>

                          <div className="gc-landing-sheet-field">
                            <span aria-hidden="true" style={{ width:30, height:30, display:"grid", placeItems:"center", flexShrink:0, borderRadius:9, color:C.maroon, background:"#f2e5d5", fontSize:13, fontWeight:700 }}>{sym}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
                                <label htmlFor="gc-landing-budget">{landingForm.budgetLabel}</label>
                                <strong style={{ color:C.maroon, fontFamily:DISPLAY, fontSize:17 }}>{fmtBudget(g.budget, sym)}</strong>
                              </div>
                              <input id="gc-landing-budget" type="range" min={0} max={36} step={1} value={budgetToSliderStep(g.budget)} onChange={e => setG(p => ({ ...p, budget:sliderStepToBudget(+e.target.value) }))}
                                style={{ width:"100%", background:`linear-gradient(90deg,${C.maroon} ${(budgetToSliderStep(g.budget)/36)*100}%,#ddcbb6 ${(budgetToSliderStep(g.budget)/36)*100}%)` }}/>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop:"auto" }}>
                          <button type="button" onClick={submitLandingAnswer} disabled={!g.recipientName.trim() || !g.occasion?.trim()}
                            style={{ width:"100%", minHeight:47, border:"none", borderRadius:14, background: g.recipientName.trim() && g.occasion?.trim() ? "linear-gradient(150deg,#ef735f,#d85849)" : "#b9c7c3", color:"#fff", font:`700 14px ${BODY}`, cursor: g.recipientName.trim() && g.occasion?.trim() ? "pointer" : "not-allowed", boxShadow: g.recipientName.trim() && g.occasion?.trim() ? "0 7px 18px rgba(32,55,70,.24)" : "none" }}>
                            {landingForm.cta}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })(),
            document.body
          )}

          {/* ══ HOME / APP ══ */}
              {/* MOBILE FLOW — clues → signals → results → refinement */}
              {mobileFlow && screen === "clues" && (
                <section className="gc-fade gc-flow-screen gc-flow-clues" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <header className="gc-clue-chat-heading">
                    <span>CONVERSAZIONE GUIDATA</span>
                    <h1 className="gc-flow-title" style={{ margin:"0 0 5px", color:C.ink, fontFamily:DISPLAY, fontSize:27, lineHeight:1.05, letterSpacing:"-.03em" }}>Parlami di {g.recipientName}.</h1>
                    <p className="gc-flow-lede" style={{ margin:"0 0 14px", color:C.muted4, fontSize:12.5, lineHeight:1.4 }}>Parti da ciò che sai. Gifty farà solo le domande utili prima di cercare.</p>
                  </header>
                  <div className="gc-clue-chat-thread" aria-live="polite">
                    {clueChat.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`gc-clue-message gc-clue-message--${message.role}`}>
                        {message.role === "assistant" && <span className="gc-clue-message-avatar"><GiftSVG size={14} fill="#17303e"/></span>}
                        <div><small>{message.role === "assistant" ? "Gifty AI" : "Tu"}</small><p>{message.content}</p></div>
                      </div>
                    ))}
                    {signalsBusy && <div className="gc-clue-message gc-clue-message--assistant"><span className="gc-clue-message-avatar"><GiftSVG size={14} fill="#17303e"/></span><div><small>Gifty AI</small><p className="gc-clue-typing"><i/><i/><i/></p></div></div>}
                  </div>
                  {adaptiveQuestion?.opzioni?.length ? (
                    <div className="gc-clue-quick-replies">
                      {adaptiveQuestion.opzioni.map(option => <button key={option.id} type="button" disabled={signalsBusy} onClick={() => organizeClues(option.label)}>{option.label}</button>)}
                    </div>
                  ) : null}
                  <div className="gc-clue-composer" style={{ position:"relative" }}>
                    <textarea id="gc-clue-text" className="gc-mobile-textarea" value={clueText} onChange={event => setClueText(event.target.value)}
                      onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); organizeClues(); } }}
                      placeholder={clueChat.length ? "Scrivi la tua risposta…" : `Esempio: ${g.recipientName || "Francesco"} gioca a padel, viaggia spesso per lavoro, ha già racchetta e scarpe e preferisce cose pratiche.`}
                      style={{ width:"100%", resize:"none", boxSizing:"border-box", color:C.ink, fontFamily:BODY }}/>
                    <div className="gc-clue-composer-actions">
                      <button type="button" onClick={toggleVoiceInput} aria-label={isListening ? "Interrompi registrazione" : "Parla invece di scrivere"} className={isListening ? "gc-voice-button gc-voice-button--active" : "gc-voice-button"}>
                        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.9"/><path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v4M9 21h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
                      </button>
                      <button type="button" className="gc-clue-send" onClick={() => organizeClues()} disabled={clueText.trim().length < (clueChat.length ? 2 : 8) || signalsBusy} aria-label="Invia messaggio">↑</button>
                    </div>
                  </div>
                  {(voiceError || isListening || errorMsg) && <div className="gc-clue-voice-status">{errorMsg || voiceError || "Ti ascolto… il testo apparirà nel messaggio."}</div>}
                </section>
              )}

              {false && mobileFlow && screen === "signals" && (
                <section className="gc-fade gc-flow-screen gc-flow-signals" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <h1 className="gc-flow-title" style={{ margin:"0 0 5px", color:C.ink, fontFamily:DISPLAY, fontSize:26, lineHeight:1.08, letterSpacing:"-.03em" }}>Conferma i criteri rilevati.</h1>
                  <p className="gc-flow-lede" style={{ margin:"0 0 13px", color:C.muted4, fontSize:12, lineHeight:1.4 }}>Puoi correggerli prima che influenzino la ricerca.</p>
                  {errorMsg && <div style={{ marginBottom:10, padding:"9px 11px", borderRadius:10, background:"#f8dfd9", color:"#8d413e", fontSize:11.5 }}>{errorMsg}</div>}
                  <div className="gc-signals-grid" style={{ display:"grid", gap:7 }}>
                    {signals.map((signal, index) => {
                      const isConstraint = /non |evita|odia|tropp|vincol|lament/i.test(`${signal.key} ${signal.value}`);
                      return (
                        <div key={`${signal.key}-${index}`} style={{ minHeight:52, padding:"8px 10px", display:"flex", alignItems:"center", gap:10, border:`1px solid ${isConstraint ? "#d5c69c" : "#dec7b0"}`, borderRadius:13, background:isConstraint ? "#f4f0dc" : "#fffaf4" }}>
                          <span style={{ width:28, height:28, flexShrink:0, borderRadius:9, display:"grid", placeItems:"center", color:isConstraint ? "#8d7346" : "#9b5756", background:isConstraint ? "#ebe4c4" : "#f2e2d6", fontSize:14 }}>{isConstraint ? "⊘" : "✦"}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            {editingSignals ? (
                              <>
                                <input value={signal.key} onChange={event => setSignals(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, key:event.target.value } : item))}
                                  style={{ width:"100%", border:0, borderBottom:"1px solid #dfc7ae", background:"transparent", color:C.ink, fontSize:12.5, fontWeight:700, fontFamily:BODY, padding:"0 0 2px" }}/>
                                <input value={signal.value} onChange={event => setSignals(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, value:event.target.value } : item))}
                                  style={{ width:"100%", border:0, background:"transparent", color:C.muted4, fontSize:10.5, fontFamily:BODY, padding:"3px 0 0" }}/>
                              </>
                            ) : (
                              <><strong style={{ display:"block", color:C.ink, fontSize:12.5 }}>{signal.key}</strong><small style={{ display:"block", color:C.muted4, fontSize:10, marginTop:1 }}>{signal.value}</small></>
                            )}
                          </div>
                          {editingSignals ? (
                            <button type="button" onClick={() => setSignals(previous => previous.filter((_, itemIndex) => itemIndex !== index))} aria-label="Rimuovi segnale" style={{ border:0, background:"transparent", color:"#a25e5a", fontSize:17, cursor:"pointer" }}>×</button>
                          ) : (
                            <span style={{ padding:"3px 6px", borderRadius:999, background:isConstraint ? "#eadfd1" : "#efe1d8", color:C.muted4, fontSize:8.5 }}>{isConstraint ? "decisivo" : index < 2 ? "forte" : "recente"}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setEditingSignals(editing => !editing)} style={{ alignSelf:"flex-end", marginTop:9, border:0, background:"transparent", color:C.maroon, fontSize:12, fontWeight:700, cursor:"pointer" }}>{editingSignals ? "Fine" : "Correggi"}</button>
                  <div className="gc-flow-primary-action" style={{ marginTop:"auto", paddingTop:12 }}>
                    <div style={{ textAlign:"center", color:C.muted2, fontSize:9.5, marginBottom:8 }}>L’AI può combinare i segnali oppure esplorare lati diversi di {g.recipientName}.</div>
                    <button type="button" onClick={generateMobileResults} disabled={!signals.length}
                      style={{ width:"100%", minHeight:48, border:0, borderRadius:13, background:signals.length ? C.maroon : "#ccb9a6", color:"#fff", fontSize:13.5, fontWeight:700, cursor:signals.length ? "pointer" : "not-allowed" }}>
                      Vai ai risultati
                    </button>
                  </div>
                </section>
              )}

              {screen === "favorites" && (
                <section className="gc-fade gc-flow-screen gc-flow-favorites" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <button type="button" onClick={() => setScreen(favoritesReturnScreen)} style={{ alignSelf:"flex-start", marginBottom:8, padding:0, border:0, background:"transparent", color:C.maroon, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>← Torna indietro</button>
                  <h1 style={{ margin:"0 0 5px", color:C.ink, fontFamily:DISPLAY, fontSize:27, lineHeight:1.05, letterSpacing:"-.03em" }}>I tuoi preferiti.</h1>
                  <p style={{ margin:"0 0 14px", color:C.muted4, fontSize:12 }}>Raggruppati in base alla ricerca da cui provengono.</p>
                  {favoriteSearches.length === 0 ? (
                    <div style={{ flex:1, display:"grid", placeItems:"center", textAlign:"center", padding:"30px 20px" }}>
                      <div><div style={{ width:58, height:58, margin:"0 auto 13px", borderRadius:"50%", display:"grid", placeItems:"center", background:"#f2e2d4", color:C.maroon, fontSize:27 }}>♡</div><strong style={{ display:"block", color:C.ink, fontFamily:DISPLAY, fontSize:20 }}>Ancora nessun preferito</strong><span style={{ display:"block", marginTop:5, color:C.muted4, fontSize:11.5 }}>Tocca il cuore su un regalo per ritrovarlo qui.</span></div>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gap:8, overflowY:"auto", paddingBottom:10 }}>
                      {favoriteSearches.map(search => {
                        const expanded = expandedFavoriteSearch === search.id;
                        return (
                          <div key={search.id} style={{ border:"1px solid #dbc3aa", borderRadius:14, overflow:"hidden", background:"#fffaf4", boxShadow:"0 6px 18px rgba(83,49,36,.06)" }}>
                            <button type="button" onClick={() => setExpandedFavoriteSearch(current => current === search.id ? null : search.id)} style={{ width:"100%", minHeight:62, padding:"10px 12px", border:0, background:expanded ? "#f0dfc9" : "#fffaf4", display:"flex", alignItems:"center", gap:10, textAlign:"left", cursor:"pointer" }}>
                              <span style={{ width:34, height:34, flexShrink:0, borderRadius:10, display:"grid", placeItems:"center", background:"linear-gradient(145deg,#e3bc79,#ca9553)", color:C.maroon }}>♥</span>
                              <span style={{ flex:1, minWidth:0 }}><strong style={{ display:"block", color:C.ink, fontFamily:DISPLAY, fontSize:16 }}>{search.name}</strong><small style={{ display:"block", marginTop:2, color:C.muted4, fontSize:9.5 }}>{search.occasion} · max {fmtBudget(search.budget, search.currencySymbol)} · {search.gifts.length} {search.gifts.length === 1 ? "preferito" : "preferiti"}</small></span>
                              <span aria-hidden="true" style={{ color:C.maroon, transform:expanded ? "rotate(180deg)" : "none", transition:"transform .2s" }}>⌄</span>
                            </button>
                            {expanded && <div style={{ padding:"4px 8px 8px", borderTop:"1px solid #dfcbb5" }}>
                              {search.gifts.map(gift => (
                                <button key={gift.id} type="button" onClick={() => { setSelectedFavorite({ groupId:search.id, giftId:gift.id }); setScreen("favorite-detail"); }} style={{ width:"100%", padding:"10px 7px", border:0, borderBottom:"1px solid #eee0d2", background:"transparent", display:"flex", alignItems:"center", gap:9, textAlign:"left", cursor:"pointer" }}>
                                  <span style={{ width:28, height:28, borderRadius:8, display:"grid", placeItems:"center", background:"#f3e5d8", color:C.maroon, fontSize:12 }}>✦</span><span style={{ flex:1, color:C.ink, fontSize:11.5, fontWeight:700 }}>{gift.title}</span><span style={{ color:C.maroon, fontFamily:DISPLAY, fontSize:13 }}>{toPriceBand(gift.priceRange, search.currencySymbol)}</span><span style={{ color:C.muted2 }}>›</span>
                                </button>
                              ))}
                            </div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button type="button" onClick={restart} style={{ width:"100%", minHeight:42, marginTop:"auto", border:"1px solid #d3b597", borderRadius:11, background:"#fffaf4", color:C.maroon, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>Inizia una nuova ricerca</button>
                </section>
              )}

              {screen === "favorite-detail" && selectedFavoriteGroup && selectedFavoriteGift && (
                <section className="gc-fade gc-flow-screen gc-flow-favorite-detail" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <button type="button" onClick={() => setScreen("favorites")} style={{ alignSelf:"flex-start", marginBottom:8, padding:0, border:0, background:"transparent", color:C.maroon, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>← Tutti i preferiti</button>
                  <div style={{ marginBottom:8, color:"#a45e5b", fontSize:8.5, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase" }}>{selectedFavoriteGroup.name} · {selectedFavoriteGroup.occasion} · max {fmtBudget(selectedFavoriteGroup.budget, selectedFavoriteGroup.currencySymbol)}</div>
                  <article style={{ border:"1px solid #dfc8af", borderRadius:18, background:"#fffaf4", padding:8, boxShadow:"0 12px 28px rgba(91,45,39,.09)" }}>
                    <div style={{ height:190, borderRadius:13, overflow:"hidden", background:"linear-gradient(145deg,#ead8c4,#d8b99b)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={selectedFavoriteGift.imageUrl || `/api/product-image?q=${encodeURIComponent(selectedFavoriteGift.imageSearchQuery ?? selectedFavoriteGift.title)}`} alt={selectedFavoriteGift.title} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    </div>
                    <div style={{ padding:"12px 4px 4px" }}><div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}><h1 style={{ margin:"0 0 7px", color:C.ink, fontFamily:DISPLAY, fontSize:22, lineHeight:1.08 }}>{selectedFavoriteGift.title}</h1><strong style={{ whiteSpace:"nowrap", color:C.maroon, fontFamily:DISPLAY, fontSize:17 }}>{toPriceBand(selectedFavoriteGift.priceRange, selectedFavoriteGroup.currencySymbol)}</strong></div><p style={{ margin:"0 0 12px", color:C.muted4, fontSize:11.5, lineHeight:1.42 }}>{selectedFavoriteGift.reason || selectedFavoriteGift.description}</p>
                      <a href={addAffiliateTag(selectedFavoriteGift.amazonLink || `https://www.amazon.it/s?k=${encodeURIComponent(selectedFavoriteGift.title)}`)} target="_blank" rel="noopener noreferrer" style={{ display:"block", width:"100%", padding:"11px", borderRadius:10, boxSizing:"border-box", textAlign:"center", textDecoration:"none", background:C.maroon, color:"#fff", fontSize:12, fontWeight:700 }}>Acquista su Amazon</a>
                      <button type="button" onClick={() => refineSavedFavorite(selectedFavoriteGroup, selectedFavoriteGift)} style={{ width:"100%", minHeight:40, marginTop:7, border:"1px solid #d2b494", borderRadius:10, background:"#fffaf4", color:C.maroon, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>Rifinisci partendo da questo regalo</button>
                      <button type="button" onClick={() => removeFavoriteFromSavedSearch(selectedFavoriteGroup.id, selectedFavoriteGift.id)} style={{ width:"100%", minHeight:36, marginTop:5, border:0, background:"transparent", color:C.muted4, fontSize:10.5, cursor:"pointer" }}>⌫ Scarta dai preferiti</button>
                    </div>
                  </article>
                </section>
              )}

              {mobileFlow && screen === "loading" && (
                <section className="gc-fade gc-flow-screen gc-flow-loading" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, display:"flex", flexDirection:"column" }}>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", paddingBottom:42 }}>
                    <div className="gc-loading-visual" style={{ position:"relative", width:194, height:194, marginBottom:26 }}>
                      <div className="gc-loader-glow" style={{ position:"absolute", inset:18, borderRadius:"50%", background:"radial-gradient(circle,rgba(224,176,95,.42),rgba(124,63,63,.08) 48%,transparent 72%)", filter:"blur(2px)" }}/>
                      <div className="gc-loader-sweep" style={{ position:"absolute", inset:8, borderRadius:"50%", background:"conic-gradient(from 30deg,transparent 0 16%,rgba(201,151,79,.8) 22%,transparent 31% 56%,rgba(146,76,74,.65) 63%,transparent 72%)", WebkitMask:"radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0)", mask:"radial-gradient(farthest-side,transparent calc(100% - 2px),#000 0)" }}/>
                      <div className="gc-loader-turn" style={{ position:"absolute", inset:9, border:"1px dashed rgba(124,63,63,.22)", borderRadius:"50%" }}>
                        {[{top:-8,left:72,icon:"✦",delay:"0s"},{top:122,left:-1,icon:"♡",delay:".35s"},{top:128,left:141,icon:"⌕",delay:".7s"}].map((node,index) => (
                          <span key={node.icon} className="gc-loader-counter" style={{ position:"absolute", top:node.top, left:node.left, width:42, height:48, display:"grid", placeItems:"center" }}>
                            <span className="gc-loader-node" style={{ width:38, height:43, borderRadius:12, display:"grid", placeItems:"center", color:index === 1 ? "#fff7e7" : C.maroon, background:index === 1 ? "linear-gradient(145deg,#a55c58,#7c3f3f)" : "linear-gradient(145deg,#fffdf7,#f1e2ce)", border:"1px solid #d8b98f", boxShadow:"0 10px 22px rgba(79,43,35,.18),inset 0 1px 0 rgba(255,255,255,.8)", fontSize:16, animationDelay:node.delay }}>{node.icon}</span>
                          </span>
                        ))}
                      </div>
                      <div style={{ position:"absolute", left:49, top:59, width:88, height:77, borderRadius:20, background:"#d9c0a6", transform:"rotate(-10deg)", opacity:.55 }}/>
                      <div style={{ position:"absolute", left:58, top:52, width:88, height:77, borderRadius:20, background:"#ead9c4", border:"1px solid #d6b78f", transform:"rotate(7deg)", boxShadow:"0 10px 25px rgba(86,49,39,.12)" }}/>
                      <div className="gc-loader-core" style={{ position:"absolute", left:57, top:55, width:82, height:82, overflow:"hidden", display:"grid", placeItems:"center", background:"linear-gradient(145deg,#a65d59 0%,#7c3f3f 58%,#652f31 100%)", border:"1px solid rgba(255,239,213,.5)", boxShadow:"0 20px 42px rgba(124,63,63,.34),inset 0 1px 0 rgba(255,255,255,.22)" }}>
                        <div className="gc-loader-scan" style={{ position:"absolute", left:8, right:8, top:"50%", height:18, background:"linear-gradient(180deg,transparent,rgba(255,226,167,.25),rgba(255,240,205,.8),transparent)", filter:"blur(.2px)" }}/>
                        <GiftSVG size={34} fill="#fff0d3"/>
                      </div>
                      <span className="gc-loader-spark" style={{ position:"absolute", right:43, top:36, color:"#d8a64d", fontSize:19, textShadow:"0 2px 10px rgba(216,166,77,.55)" }}>✦</span>
                      <span className="gc-loader-spark" style={{ position:"absolute", left:39, bottom:37, color:"#a75d59", fontSize:12, animationDelay:".7s" }}>✦</span>
                    </div>
                    <div style={{ color:"#a45e5b", fontSize:9, fontWeight:800, letterSpacing:".15em", textTransform:"uppercase", marginBottom:9 }}>Ricerca personale in corso</div>
                    <h2 className="gc-loading-title" style={{ margin:"0 0 11px", maxWidth:380, color:C.ink, fontFamily:"var(--font-bricolage)", fontSize:27, fontWeight:700, lineHeight:1.08, letterSpacing:"-.025em" }}>Cerco il regalo giusto per {g.recipientName}.</h2>
                    <p key={loadingLine} className="gc-fade" style={{ margin:0, color:C.muted4, fontFamily:DISPLAY, fontSize:17, fontStyle:"italic" }}>{MOBILE_LOADING_LINES[loadingLine % MOBILE_LOADING_LINES.length]}</p>
                  </div>
                </section>
              )}

              {mobileFlow && screen === "results" && gifts.length > 0 && (
                <section className="gc-fade gc-flow-screen gc-flow-results" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <div className="gc-results-kicker" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:5 }}>
                    <div style={{ color:"#a45e5b", fontSize:9.5, fontWeight:800, letterSpacing:".12em", textTransform:"uppercase" }}><span className="gc-mobile-kicker">{refinementRound ? "Ricerca rifinita" : `Idea ${resultIndex + 1} di ${gifts.length}`}</span><span className="gc-desktop-kicker">{refinementRound ? "Ricerca rifinita" : `${gifts.length} idee selezionate`}</span></div>
                  </div>
                  <h1 style={{ margin:"0 0 8px", color:C.ink, fontFamily:DISPLAY, fontSize:25, lineHeight:1.08, letterSpacing:"-.03em" }}>{refinementRound ? `Nuove scelte per ${g.recipientName}` : `Scelte per ${g.recipientName}`}</h1>
                  {refinementRound > 0 && favoriteGifts.length > 0 && (
                    <div style={{ marginBottom:8, padding:"8px 10px", display:"flex", alignItems:"center", gap:8, border:"1px solid #ddc7b0", borderRadius:12, background:"#fff8f0" }}>
                      <span style={{ color:C.maroon }}>♥</span><div><small style={{ display:"block", color:"#a45e5b", fontSize:8, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>Preferito conservato</small><strong style={{ color:C.ink, fontSize:10.5 }}>{favoriteGifts[0].title}</strong></div>
                    </div>
                  )}
                  <div className="gc-mobile-result-deck">
                    {renderMobileResultCard(gifts[resultIndex])}
                    <div aria-label={`Risultato ${resultIndex + 1} di ${gifts.length}`} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:13, padding:"10px 0 7px" }}>
                      <button type="button" onClick={() => setResultIndex(index => (index - 1 + gifts.length) % gifts.length)} aria-label="Idea precedente" style={{ width:29, height:29, borderRadius:"50%", border:"1px solid #ddc7b0", background:"#fffaf4", color:C.maroon, cursor:"pointer" }}>‹</button>
                      <div style={{ display:"flex", gap:7 }}>{gifts.map((gift, index) => <button key={gift.id} type="button" onClick={() => setResultIndex(index)} aria-label={`Mostra risultato ${index + 1}`} style={{ width:index === resultIndex ? 22 : 8, height:8, padding:0, border:0, borderRadius:99, background:index === resultIndex ? "#a25b5b" : "#cdb9a5", boxShadow:index === resultIndex ? "0 0 0 3px rgba(162,91,91,.12)" : "none", transition:"all .2s", cursor:"pointer" }}/>)}</div>
                      <button type="button" onClick={() => setResultIndex(index => (index + 1) % gifts.length)} aria-label="Idea successiva" style={{ width:29, height:29, borderRadius:"50%", border:"1px solid #ddc7b0", background:"#fffaf4", color:C.maroon, cursor:"pointer" }}>›</button>
                    </div>
                  </div>
                  <div className="gc-desktop-results-grid">{gifts.map((gift, index) => renderDesktopResultCard(gift, index))}</div>
                  <div style={{ marginTop:"auto", paddingTop:6 }}>
                    <button type="button" onClick={restartAtSearch} style={{ width:"100%", minHeight:40, border:0, background:"transparent", color:C.muted4, fontSize:11.5, textDecoration:"underline", cursor:"pointer" }}>Ricomincia da capo</button>
                  </div>
                </section>
              )}

              {mobileFlow && screen === "refine" && (
                <section className="gc-fade gc-flow-screen gc-flow-refine" style={{ width:"100%", maxWidth:430, margin:"0 auto", flex:1, minHeight:0, display:"flex", flexDirection:"column" }}>
                  <div style={{ color:"#a45e5b", fontSize:9.5, fontWeight:800, letterSpacing:".12em", textTransform:"uppercase", marginBottom:7 }}>Parto da questa idea</div>
                  <h1 style={{ margin:"0 0 5px", color:C.ink, fontFamily:DISPLAY, fontSize:25, lineHeight:1.06, letterSpacing:"-.03em" }}>Troviamo la versione giusta.</h1>
                  <p style={{ margin:"0 0 11px", color:C.muted4, fontSize:11.5 }}>Uso questo regalo come base e modifico solo ciò che mi indichi.</p>
                  <div style={{ minHeight:54, padding:"9px 11px", border:"1px solid #ddc7b0", borderRadius:13, background:"#fff9f2", marginBottom:10 }}>
                    <small style={{ display:"block", color:"#a45e5b", fontSize:8, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", marginBottom:4 }}>Regalo di partenza</small>
                    <div style={{ display:"flex", alignItems:"center", gap:7, color:C.ink, fontSize:11.5 }}><span style={{ color:C.maroon }}>✦</span>{refineBaseGift?.title || gifts[resultIndex]?.title}</div>
                  </div>
                  <label htmlFor="gc-refine-text" style={{ color:C.label, fontSize:10, fontWeight:700, marginBottom:6 }}>Come deve essere l’alternativa?</label>
                  <textarea id="gc-refine-text" className="gc-mobile-textarea" value={refineText} onChange={event => setRefineText(event.target.value)} placeholder="Esempio: stessa idea, ma più compatta, di qualità migliore e adatta a chi ha appena iniziato."
                    style={{ width:"100%", minHeight:112, resize:"none", boxSizing:"border-box", padding:"12px", border:"1.5px solid #d39d55", borderRadius:14, background:"#fffdf9", color:C.ink, fontFamily:BODY, fontSize:16, lineHeight:1.42 }}/>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                    {["Più economico","Qualità migliore","Consegna rapida","Più originale"].map(choice => {
                      const active = refineChoices.includes(choice);
                      return <button key={choice} type="button" onClick={() => setRefineChoices(previous => active ? previous.filter(item => item !== choice) : [...previous, choice])}
                        style={{ padding:"7px 9px", border:`1px solid ${active ? "#9d5a58" : "#ddc7b0"}`, borderRadius:999, background:active ? "#9d5a58" : "#fff8ef", color:active ? "#fff" : C.muted4, fontSize:10.5, cursor:"pointer" }}>{choice}</button>;
                    })}
                  </div>
                  {errorMsg && <div style={{ marginTop:9, color:"#963f3d", fontSize:11 }}>{errorMsg}</div>}
                  <div style={{ marginTop:"auto", paddingTop:12 }}>
                    <div style={{ textAlign:"center", color:C.muted2, fontSize:9, marginBottom:7 }}>Cerco alternative simili senza ripetere i prodotti già visti.</div>
                    <button type="button" onClick={refineMobileResults} disabled={refining || (!refineText.trim() && refineChoices.length === 0)}
                      style={{ width:"100%", minHeight:48, border:0, borderRadius:13, background:(!refineText.trim() && !refineChoices.length) ? "#ccb9a6" : C.maroon, color:"#fff", fontSize:13, fontWeight:700, cursor:(!refineText.trim() && !refineChoices.length) ? "not-allowed" : "pointer" }}>
                      {refining ? "Cerco alternative…" : "Trova alternative simili"}
                    </button>
                    <button type="button" onClick={restartAtSearch} style={{ width:"100%", minHeight:36, marginTop:5, border:0, background:"transparent", color:C.muted4, fontSize:11, textDecoration:"underline", cursor:"pointer" }}>Ricomincia da capo</button>
                  </div>
                </section>
              )}

              {/* INTAKE */}
              {screen === "intake" && (
                <div className="gc-intake-wrap" style={{ maxWidth:640, width:"100%", margin:"0 auto", flex:1, display:"flex", flexDirection:"column" }}>
                  {/* Progress */}
                  <div className="gc-progress" style={{ marginBottom:30 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:9 }}>
                      <span style={{ fontSize:13, fontWeight:600, letterSpacing:".04em", textTransform:"uppercase" as const, color:C.muted3 }}>{tr.stepWord} {step+1} {tr.ofWord} 4</span>
                    </div>
                    <div style={{ height:6, background:C.bord3, borderRadius:999, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:"linear-gradient(90deg,#c9a26b,#7c3f3f)", borderRadius:999, width:`${((step+1)/4)*100}%`, transition:"width .45s cubic-bezier(.4,0,.2,1)" }}/>
                    </div>
                  </div>

                  {/* Concierge bubble */}
                  <div key={`bubble-${stepKey}`} className="gc-fade gc-bubble" style={{ display:"flex", gap:14, marginBottom:26, alignItems:"flex-start" }}>
                    <div style={{ flexShrink:0, width:46, height:46, borderRadius:"50%", background:"linear-gradient(140deg,#7c3f3f,#a8694a)", display:"flex", alignItems:"center", justifyContent:"center", color:"#f3e7d8", fontFamily:DISPLAY, fontWeight:600, fontSize:19, boxShadow:"0 4px 12px rgba(124,63,63,.25)" }}>G</div>
                    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:"4px 18px 18px 18px", padding:"15px 19px", boxShadow:"0 2px 10px rgba(124,63,63,.05)" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.gold, letterSpacing:".03em", marginBottom:3 }}>{tr.conciergeLabel}</div>
                      <div style={{ fontSize:17, lineHeight:1.45, color:C.body, fontWeight:500 }}>{tr.msgs("")[step]}</div>
                    </div>
                  </div>

                  {/* Step content */}
                  <div key={`content-${stepKey}`} className="gc-fade" style={{ flex:1 }}>

                    {/* Step 0 — Relationship + Gender + Age */}
                    {step === 0 && (
                      <div>
                        {!skipRelPicker && (
                          <>
                            <div style={{ fontSize:14, fontWeight:600, color:C.label, marginBottom:11 }}>{tr.relTitle}</div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:9 }}>
                              {tr.rel.map((r, i) => (
                                <button key={i} onClick={() => setG(p => ({ ...p, relationship: r, showOtherRel: r === tr.rel[tr.rel.length - 1] }))} style={chipSt(g.relationship === r || (g.showOtherRel && r === tr.rel[tr.rel.length - 1]))}>{r}</button>
                              ))}
                            </div>
                            {g.showOtherRel && (
                              <input
                                type="text" autoFocus autoComplete="off" autoCorrect="off" name="gc-relation-other"
                                value={g.relationship === tr.rel[tr.rel.length - 1] ? "" : g.relationship}
                                onChange={e => setG(p => ({ ...p, relationship: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter" && canContinue()) advance(); }}
                                placeholder={tr.relOtherPlaceholder}
                                style={{ width:"100%", marginTop:14, padding:"14px 16px", border:`1.5px solid ${C.bord3}`, borderRadius:14, fontFamily:BODY, fontSize:16, fontWeight:500, color:C.ink, background:"#fff", boxSizing:"border-box" as const }}
                              />
                            )}
                          </>
                        )}
                        <div style={{ fontSize:14, fontWeight:600, color:C.label, margin: skipRelPicker ? "0 0 11px" : "30px 0 11px" }}>{tr.genderQ}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:9, marginBottom:30 }}>
                          {tr.genderOpts.map((opt, i) => (
                            <button key={i} onClick={() => setG(p => ({ ...p, gender: opt }))} style={chipSt(g.gender === opt)}>{opt}</button>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.label }}>{tr.ageQ}</span>
                        </div>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={g.age === 0 ? "" : String(g.age)}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                            const v = digits === "" ? 0 : Math.max(1, Math.min(99, +digits));
                            setG(p => ({ ...p, age: v }));
                          }}
                          placeholder={tr.yrs}
                          style={{ width:120, padding:"11px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:BODY, fontWeight:500, fontSize:16, color:C.ink, background:"#fff", boxSizing:"border-box" as const }}
                        />
                        <span style={{ marginLeft:10, fontSize:14, color:C.muted2 }}>{tr.yrs}</span>
                      </div>
                    )}

                    {/* Step 1 — Budget + Occasion */}
                    {step === 1 && (
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.label }}>{tr.budgetTitle}</span>
                          <span style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:22, color:C.maroon }}>{fmtBudget(g.budget, sym)}</span>
                        </div>
                        <input type="range" min={10} max={500} step={5} value={g.budget}
                          onChange={e => setG(p => ({ ...p, budget: +e.target.value }))}
                          style={{ width:"100%", background:`linear-gradient(90deg,${C.maroon} ${((g.budget-10)/490)*100}%,#e3d4c2 ${((g.budget-10)/490)*100}%)` }}
                        />
                        {/* Tick labels positioned at exact % matching the linear 10-500 scale */}
                        <div style={{ position:"relative", height:18, marginTop:5, marginBottom:30 }}>
                          {([10,100,250,500] as const).map(v => (
                            <span key={v} style={{ position:"absolute", left:`${((v-10)/490)*100}%`, transform:"translateX(-50%)", fontSize:12, color:C.muted2, whiteSpace:"nowrap" as const }}>
                              {v === 500 ? `${sym}500+` : `${sym}${v}`}
                            </span>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.label }}>{tr.occQ}</span>
                        </div>
                        <input
                          type="text" autoComplete="off" autoCorrect="off" name="gc-occasion"
                          value={g.occasion ?? ""}
                          onChange={e => setG(p => ({ ...p, occasion: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter" && canContinue()) advance(); }}
                          placeholder={tr.occPlaceholder}
                          style={{ width:"100%", padding:"14px 16px", border:`1.5px solid ${C.bord3}`, borderRadius:14, fontFamily:BODY, fontSize:16, fontWeight:500, color:C.ink, background:"#fff", boxSizing:"border-box" as const }}
                        />
                      </div>
                    )}

                    {/* Step 2 — Interests */}
                    {step === 2 && <InterestsStep g={g} setG={setG} tr={tr} />}

                    {/* Step 3 — Interest deep-dive (final step) */}
                    {step === 3 && <InterestDeepDiveStep g={g} setG={setG} tr={tr} />}
                  </div>

                  {/* Nav */}
                  <div className="gc-intake-nav" style={{ display:"flex", alignItems:"center", gap:14, marginTop:34, paddingTop:22, borderTop:`1px solid ${C.bord4}` }}>
                    {step > 0 && (
                      <button onClick={goBack} style={{ padding:"13px 20px", borderRadius:12, border:`1.5px solid ${C.bord5}`, background:"transparent", color:C.muted4, font:`600 15px ${BODY}`, cursor:"pointer" }}>
                        ← {tr.back}
                      </button>
                    )}
                    <div style={{ flex:1 }}/>
                    <button onClick={advance} disabled={!canContinue()} style={canContinue() ? btnPrimary : btnDisabled}>
                      {(step === 3 || (step === 2 && !hasInterestDeepDive())) ? tr.findGifts : tr.continue}
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING */}
              {!mobileFlow && screen === "loading" && (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
                  <div style={{ position:"relative", width:120, height:120, marginBottom:34 }}>
                    <div className="gc-orbit" style={{ position:"absolute", inset:0 }}>
                      <span style={{ position:"absolute", top:0, left:"50%", marginLeft:-7, width:14, height:14, borderRadius:"50%", background:C.maroon }}/>
                      <span style={{ position:"absolute", bottom:0, left:"50%", marginLeft:-5, width:10, height:10, borderRadius:"50%", background:C.gold }}/>
                      <span style={{ position:"absolute", left:0, top:"50%", marginTop:-4, width:8, height:8, borderRadius:"50%", background:C.terra }}/>
                    </div>
                    <div className="gc-bob" style={{ position:"absolute", inset:30, borderRadius:"50%", background:"linear-gradient(140deg,#7c3f3f,#a8694a)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(124,63,63,.3)" }}>
                      <GiftSVG size={28} fill="#f3e7d8" />
                    </div>
                  </div>
                  <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:27, color:C.body, margin:"0 0 10px", letterSpacing:"-.01em" }}>{tr.loadingTitle}</h2>
                  <p style={{ fontSize:16, color:C.muted, margin:"0 0 24px" }}>{LOADING_LINES[loadingLine]}</p>
                  <div style={{ display:"flex", gap:7 }}>
                    <span className="gc-p1" style={{ width:9, height:9, borderRadius:"50%", background:C.maroon, display:"block" }}/>
                    <span className="gc-p2" style={{ width:9, height:9, borderRadius:"50%", background:C.maroon, display:"block" }}/>
                    <span className="gc-p3" style={{ width:9, height:9, borderRadius:"50%", background:C.maroon, display:"block" }}/>
                  </div>
                </div>
              )}

              {/* RESULTS */}
              {!mobileFlow && screen === "results" && (
                <div className="gc-fade" style={{ maxWidth:980, width:"100%", margin:"0 auto" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:8 }}>
                    <div>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:C.goldS, color:C.maroon, padding:"6px 13px", borderRadius:999, fontSize:12.5, fontWeight:600, letterSpacing:".03em", marginBottom:14 }}>
                        <span style={{ width:7, height:7, borderRadius:"50%", background:C.maroon }}/> {tr.curatedTag}
                      </div>
                      <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:30, lineHeight:1.12, color:C.ink, margin:"0 0 8px", letterSpacing:"-.02em" }}>
                        {tr.headline(sorted.length, g.recipientName, g.occasion ? (tr.occ[g.occasion] ?? tr.occFallback) : tr.occFallback)}
                      </h2>
                      <p style={{ fontSize:15.5, color:C.muted, margin:0, maxWidth:520 }}>
                        {tr.sub(fmtBudget(g.budget, sym), lang.country)}
                      </p>
                    </div>
                    <button onClick={restart} style={{ flexShrink:0, padding:"12px 18px", borderRadius:12, border:`1.5px solid ${C.bord5}`, background:"#fff", color:C.muted4, font:`600 14px ${BODY}`, cursor:"pointer" }}>
                      ↺ {tr.startOver}
                    </button>
                  </div>

                  {errorMsg && (
                    <div style={{ background:"#fdeceb", border:"1px solid #f3c4bf", color:"#9a2e22", borderRadius:12, padding:"12px 16px", fontSize:14, marginBottom:20 }}>
                      ⚠ {errorMsg}
                    </div>
                  )}

                  {/* Sort */}
                  <div style={{ display:"flex", alignItems:"center", gap:9, margin:"22px 0 20px" }}>
                    <span style={{ fontSize:13, color:C.muted2, fontWeight:600 }}>{tr.sortLabel}</span>
                    {([["price",1],["priceHigh",2]] as const).map(([s, i]) => (
                      <button key={s} onClick={() => setSortBy(s)}
                        style={s === sortBy
                          ? { padding:"8px 15px", borderRadius:999, border:`1.5px solid ${C.maroon}`, background:C.maroon, color:"#fff", font:`600 13px ${BODY}`, cursor:"pointer" }
                          : { padding:"8px 15px", borderRadius:999, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.muted4, font:`600 13px ${BODY}`, cursor:"pointer" }
                        }>
                        {tr.sortOpts[i]}
                      </button>
                    ))}
                  </div>

                  {/* Cards */}
                  <div className="gc-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
                    {sorted.map(gift => <GiftCard key={gift.id} gift={gift} showRating={!viewedEntry} />)}
                  </div>

                </div>
              )}

        </main>
      </div>
    </>
  );
}
