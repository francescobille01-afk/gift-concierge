"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { GiftSuggestion, ChatResponse, UserLocale, ChatMessage } from "@/lib/types";

/* ─── Design tokens ─────────────────────────────────────────── */
const C = {
  bg:     "#f3ebe1",
  brand:  "linear-gradient(160deg,#7c3f3f 0%,#5e2e2e 60%,#4a2222 100%)",
  maroon: "#7c3f3f",
  terra:  "#a8694a",
  gold:   "#c9a26b",
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
const DISPLAY = "'Outfit', sans-serif";
const BODY    = "'Hanken Grotesk', sans-serif";

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

export default function Home() {
  const [screen,      setScreen]      = useState<"landing"|"intake"|"loading"|"results">("intake");
  const [landingBarFocused, setLandingBarFocused] = useState(false);
  const [landingDisclaimerOpen, setLandingDisclaimerOpen] = useState(false);
  // Set when the mobile landing bar's free-text answer is used to fill
  // g.relationship directly — step 0 then skips its own relationship
  // picker since it's already answered.
  const [skipRelPicker, setSkipRelPicker] = useState(false);
  const gcMainRef = useRef<HTMLElement>(null);
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
  /* Contact form */
  const [cName,       setCName]       = useState("");
  const [cEmail,      setCEmail]      = useState("");
  const [cMsg,        setCMsg]        = useState("");
  const [contactSent, setContactSent] = useState(false);

  const HIST_KEY = "gifty-history";

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lang = LANGS[langIdx];
  const tr   = TR[lang.t as TKey] ?? TR.en;
  const sym  = lang.sym;

  /* ── Mobile landing: show the mobile-only intro screen on first mount.
     Done in an effect (not the useState initializer) so the very first
     render always matches the server ("intake"), avoiding a hydration
     mismatch — window.innerWidth isn't available during SSR. ── */
  useEffect(() => {
    if (window.innerWidth <= 900) setScreen("landing");
  }, []);

  /* ── iubenda: load once so Privacy/Cookie Policy links open as a popup ── */
  useEffect(() => {
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
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Loading status lines ── */
  const LOADING_LINES = tr.loadingLines;
  useEffect(() => {
    if (screen === "loading") {
      intervalRef.current = setInterval(() => setLoadingLine(l => (l + 1) % LOADING_LINES.length), 650);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const next = typeof window !== "undefined" && window.innerWidth <= 900 ? "landing" : "intake";
    setG(EMPTY); setStep(0); setStepKey(0); setGifts([]); setSortBy("price"); setScreen(next); setViewedEntry(null); setThumbs({}); setConvo([]); setErrorMsg(null); setSkipRelPicker(false); setLandingBarFocused(false);
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

  /* ─────────────────────────────── RENDER ─────────────────────── */
  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes gcfade  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        @keyframes gcorbit { to{transform:rotate(360deg)} }
        @keyframes gcpulse { 0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)} }
        @keyframes gcbob   { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
        @keyframes gcbarglow {
          0%,100% { box-shadow:0 0 0 5px rgba(201,162,107,.25),0 10px 26px rgba(124,63,63,.25); }
          50%     { box-shadow:0 0 0 9px rgba(201,162,107,.4),0 10px 30px rgba(124,63,63,.35); }
        }
        .gc-bar-pulse { animation:gcbarglow 2.2s ease-in-out infinite; }
        @keyframes gcflowdot {
          0%   { top:0; opacity:0; transform:scale(1); }
          5%   { opacity:1; }
          12%  { transform:scale(1.35); }
          20%  { transform:scale(1); opacity:1; }
          40%  { top:calc(50% - 5px); opacity:1; transform:scale(1); }
          47%  { transform:scale(1.35); }
          55%  { transform:scale(1); opacity:1; }
          80%  { top:calc(100% - 10px); opacity:1; transform:scale(1); }
          87%  { transform:scale(1.35); }
          95%  { transform:scale(1); opacity:1; }
          100% { top:calc(100% - 10px); opacity:0; }
        }
        .gc-flow-dot { animation:gcflowdot 4s ease-in-out infinite; }
        @keyframes gcstepbadge {
          0%,100% { background:rgba(255,255,255,.16); box-shadow:none; transform:scale(1); }
          15%     { background:rgba(240,217,168,.4); box-shadow:0 0 18px 5px rgba(240,217,168,.45); transform:scale(1.1); }
          30%     { background:rgba(255,255,255,.16); box-shadow:none; transform:scale(1); }
        }
        .gc-step-badge { animation:gcstepbadge 4s ease-in-out infinite; }
        .gc-fade  {animation:gcfade .4s ease both}
        .gc-orbit {animation:gcorbit 2.4s linear infinite}
        .gc-bob   {animation:gcbob 2s ease-in-out infinite}
        .gc-p1    {animation:gcpulse 1.2s ease-in-out infinite}
        .gc-p2    {animation:gcpulse 1.2s ease-in-out .2s infinite}
        .gc-p3    {animation:gcpulse 1.2s ease-in-out .4s infinite}
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
        @media(max-width:900px){.gc-brand{display:none!important}.gc-main{padding:24px 20px 40px!important}.gc-grid{grid-template-columns:1fr!important}
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
        @media(min-width:901px){.gc-landing{display:none!important}}
      `}</style>

      <div className="gc-shell" style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg, color:C.ink, fontFamily:BODY }}>

        {/* ══ BRAND PANEL ══════════════════════════════════════ */}
        <aside className="gc-brand" style={{ width:"38%", maxWidth:520, background:C.brand, color:"#f3e7d8", padding:"52px 46px", display:"flex", flexDirection:"column", justifyContent:"space-between", position:"sticky", top:0, height:"100vh", overflow:"hidden", flexShrink:0 }}>
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
        <main ref={gcMainRef} className={screen === "landing" ? "gc-main gc-main--flush" : "gc-main"} style={{ flex:1, padding:"40px 56px 56px", display:"flex", flexDirection:"column", minWidth:0, position:"relative", overflowY:"auto", overflowX:"hidden", height:"100vh", overscrollBehavior:"contain" }}>

          {/* Top nav */}
          {screen !== "landing" && (
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
              padding:"calc(16px + env(safe-area-inset-top)) 20px calc(190px + env(safe-area-inset-bottom))",
              minHeight:"100%",
              background:"linear-gradient(180deg,#5e2e2e 0%,#7c3f3f 32%,#b8836a 58%,#e4d2ba 78%,#f3ebe1 100%)",
            }}>
              {/* Top row: icon badge + language pill */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <GiftSVG size={18} fill="#4a2a16" />
                </div>
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
                <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:40, color:"#f8eee0", letterSpacing:"-.02em", marginBottom:4 }}>Gifty</div>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase" as const, color:"#f0d9a8", marginBottom:16 }}>{tr.landingKicker}</div>
                <p style={{ fontWeight:400, color:"#f3e7d8", margin:"0 0 16px", fontSize:14.5 }}>{tr.landingSub}</p>
                <div style={{ textAlign:"center", marginBottom:28 }}>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:".03em", color:"#f0d9a8", background:"rgba(0,0,0,.14)", border:"1px solid rgba(255,255,255,.15)", borderRadius:999, padding:"7px 14px", display:"inline-block" }}>{tr.landingBadge}</span>
                </div>
              </div>

              {/* How it works — a small glowing dot hops between the three
                  step badges on a loop, lighting each one up as it lands.
                  Centered as a group (not edge-to-edge) so the block doesn't
                  pull all the visual weight to the left. */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ position:"relative" }}>
                  <div className="gc-flow-dot" style={{ position:"absolute", left:13, width:10, height:10, borderRadius:"50%", background:"#f0d9a8", boxShadow:"0 0 10px 3px rgba(240,217,168,.8)" }} />
                  {[
                    [1, tr.howStep1Title, tr.howStep1Desc],
                    [2, tr.howStep2Title, tr.howStep2Desc],
                    [3, tr.howStep3Title, tr.howStep3Desc],
                  ].map(([n, title, desc], i) => (
                    <div key={i} style={{ display:"flex", gap:14, marginBottom: i === 2 ? 10 : 22, position:"relative", maxWidth:280 }}>
                      <div className="gc-step-badge" style={{ width:36, height:36, borderRadius:"50%", border:"1.5px solid rgba(240,217,168,.6)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:DISPLAY, fontWeight:700, fontSize:15, color:"#f8eee0", flexShrink:0, animationDelay:`${i * 1.9}s` }}>{n}</div>
                      <div style={{ paddingTop:2 }}>
                        <div style={{ fontWeight:700, fontSize:15.5, color:"#fff", marginBottom:3, textShadow:"0 1px 3px rgba(0,0,0,.25)" }}>{title}</div>
                        <div style={{ fontSize:13, color:"#f3e7d8", textShadow:"0 1px 3px rgba(0,0,0,.2)" }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legal footer: privacy policy link + a tap-to-open disclaimer
                  badge (not covered by the design handoff — added per
                  explicit request; touch-friendly since hover doesn't exist
                  on mobile). */}
              <div style={{ textAlign:"center", marginTop:6, position:"relative" }}>
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
          )}

          {/* Fixed bottom action bar — rendered via portal straight into
              <body>, outside .gc-main's internal scroll container. iOS
              Safari notoriously mispositions/drags position:fixed elements
              nested inside a custom overflow:auto scroller (here .gc-main),
              so we sidestep that entirely rather than fight it. */}
          {screen === "landing" && typeof document !== "undefined" && createPortal(
            (() => {
              const submitLandingAnswer = () => {
                if (!g.relationship.trim()) return;
                setSkipRelPicker(true);
                setScreen("intake");
              };
              return (
                <div
                  style={{
                    position:"fixed", left:0, right:0, bottom:0, background:"#e9dcc9",
                    borderRadius:"26px 26px 0 0",
                    boxShadow:"0 -10px 24px rgba(0,0,0,.15)",
                    padding:"18px 16px calc(20px + env(safe-area-inset-bottom))",
                    zIndex:200,
                  }}>
                  <div style={{ textAlign:"center", fontSize:12.5, fontWeight:700, letterSpacing:".04em", color:"#7c3f3f", marginBottom:10 }}>{tr.chatBarPrompt}</div>
                  <div className={landingBarFocused ? undefined : "gc-bar-pulse"} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, background:"#fff", border:"2px solid #c9a26b", borderRadius:999, padding:"11px 11px 11px 20px", boxShadow: landingBarFocused ? "0 0 0 7px rgba(201,162,107,.3), 0 12px 30px rgba(124,63,63,.3)" : "0 0 0 5px rgba(201,162,107,.25), 0 10px 26px rgba(124,63,63,.25)", transition:"box-shadow .3s cubic-bezier(.4,0,.2,1)" }}>
                    <input
                      type="text" autoComplete="off" autoCorrect="off" name="gc-landing-relationship"
                      value={g.relationship}
                      onChange={e => setG(p => ({ ...p, relationship: e.target.value }))}
                      onFocus={() => setLandingBarFocused(true)}
                      onBlur={() => setLandingBarFocused(false)}
                      onKeyDown={e => { if (e.key === "Enter") submitLandingAnswer(); }}
                      placeholder={tr.chatBarLabel}
                      style={{ flex:1, minWidth:0, border:"none", outline:"none", background:"transparent", fontSize:16, fontFamily:BODY, color:C.ink }}
                    />
                    <button onClick={submitLandingAnswer} aria-label={tr.continue} disabled={!g.relationship.trim()}
                      style={{ width:44, height:44, borderRadius:"50%", border:"none", background: g.relationship.trim() ? "linear-gradient(150deg,#8c4f4f,#7c3f3f)" : C.bord3, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor: g.relationship.trim() ? "pointer" : "not-allowed" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              );
            })(),
            document.body
          )}

          {/* ══ HOME / APP ══ */}
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
              {screen === "loading" && (
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
              {screen === "results" && (
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
