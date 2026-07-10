"use client";

import { useState, useEffect, useRef } from "react";
import { SignedIn, UserButton, SignInButton, useAuth, useSignIn } from "@clerk/nextjs";
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
  relTitle: string; ageQ: string;
  yrs: string;
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
}

const TR: Record<TKey, Tr> = {
  en: {
    nav: ["Home","History","Favorites","Contact us"],
    h1a:"The perfect gift,", h1b:"found for you.",
    intro:"Answer a few quick questions and Gifty — your personal concierge — will find the perfect gift for you.",
    bFree:"Free · No account · ~2 minutes", bBudget:"Every budget, every occasion", bSocial:"Reads their public socials for real clues",
    proofPre:"Loved by", proofPost:"thoughtful gifters",
    stepWord:"Step", ofWord:"of",
    stepNames:["Who are we gifting?","The occasion","The recipient & budget","Their interests","Let's get specific","A few details"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Who are we finding a gift for?",`Got it. What's the occasion for ${n}?`,`And who is ${n} to you — roughly how old are they, and what's your budget?`,`What is ${n} into? Pick everything that fits.`,"Let's get a bit more specific — this makes a huge difference.",`Last thing: anything else I should know about ${n}?`],
    namePlaceholder:"Their first name…", nameHelp:"The name helps Gifty figure out their likely gender and personalise suggestions accordingly.",
    relTitle:"Your relationship", ageQ:"Roughly how old are they?",
    yrs:"yrs",
    otherLabel:"Other…", customPlaceholder:"e.g. Formula 1, yoga, wine, vintage cars…",
    pickAtLeast:"Pick at least one", selectedWord:"selected",
    budgetTitle:"Budget",
    detailsPlaceholder:"e.g. She just moved into her first apartment and loves hosting dinner parties. Already has plenty of candles…",
    promptChips:["They already have…","Loves a particular brand","Inside joke gift"],
    back:"Back", continue:"Continue →", findGifts:"Find my gifts ✨",
    loadingTitle:"Gifty is curating…",
    loadingLines:["Reading their social profile…","Mining captions, hashtags & posts…","Matching to their interests & budget…","Ranking the best finds…"],
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
    rel:["Partner","Parent","Sibling","Friend","Best friend","Child","Grandparent","Colleague","Someone else"],
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
        brandQ: "Favourite author or what they're reading now", brandPlaceholder: "loves Murakami, currently on a fantasy series…",
      },
      4: {
        detailQ: "What kind of games do they like?", detailPlaceholder: "action/adventure, strategy, sports, indie, retro…",
        contextQ: "What do they play on most?", contextOpts: ["PC","Console","Mobile"],
        levelQ: "What kind of gamer are they?", levelOpts: ["Plays to unwind","Really into it","Competitive/hardcore level"],
        brandQ: "Platform/brand they love or gear they already have", brandPlaceholder: "PlayStation, already has a mechanical keyboard…",
      },
      5: {
        detailQ: "What genre do they listen to most?", detailPlaceholder: "pop, rock, jazz, classical, electronic, hip-hop…",
        contextQ: "How do they experience music?", contextOpts: ["Just listening","Plays an instrument","Goes to concerts often"],
        levelQ: "How into it are they?", levelOpts: ["Listens for fun","True enthusiast/collector","Musician/DJ"],
        brandQ: "Favourite artist or gear they already have", brandPlaceholder: "loves Radiohead, already has basic headphones…",
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
        brandQ: "Brand they love or gear they already have", brandPlaceholder: "loves Sony, already has Bose headphones…",
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
  },
  it: {
    nav:["Home","Cronologia","Preferiti","Contattaci"],
    h1a:"Il regalo perfetto,", h1b:"trovato per te.",
    intro:"Rispondi a qualche domanda veloce e Gifty — il tuo concierge personale — troverà il regalo perfetto per la tua occasione.",
    bFree:"Gratis · Nessun account · ~2 minuti", bBudget:"Ogni budget, ogni occasione", bSocial:"Legge i social pubblici per indizi veri",
    proofPre:"Amato da", proofPost:"gifter premurosi",
    stepWord:"Passo", ofWord:"di",
    stepNames:["Per chi è il regalo?","L'occasione","Il destinatario e budget","I suoi interessi","Entriamo nel dettaglio","Qualche dettaglio"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Per chi cerchiamo un regalo?",`Qual è l'occasione per ${n}?`,`E chi è ${n} per te — quanti anni ha più o meno, e qual è il tuo budget?`,`Cosa piace a ${n}?`,"Entriamo un po' più nel dettaglio — fa una grande differenza.",`Ultima cosa: altro che dovrei sapere su ${n}?`],
    namePlaceholder:"Il suo nome…", nameHelp:"Il nome aiuta Gifty a capire il probabile genere e a personalizzare i suggerimenti.",
    relTitle:"La tua relazione", ageQ:"Quanti anni ha più o meno?",
    yrs:"anni",
    otherLabel:"Altro…", customPlaceholder:"es. Formula 1, yoga, vino, auto d'epoca…",
    pickAtLeast:"Scegline almeno uno", selectedWord:"selezionati",
    budgetTitle:"Budget",
    detailsPlaceholder:"es. Si è appena trasferita nel suo primo appartamento e ama organizzare cene. Ha già tante candele…",
    promptChips:["Ha già…","Ama un marchio in particolare","Regalo scherzo"],
    back:"Indietro", continue:"Continua →", findGifts:"Trova i regali ✨",
    loadingTitle:"Gifty sta selezionando…",
    loadingLines:["Leggo il profilo social…","Analizzo didascalie, hashtag e post…","Abbino a interessi e budget…","Ordino i risultati migliori…"],
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
    rel:["Partner","Genitore","Fratello/Sorella","Amico/a","Migliore amico/a","Figlio/a","Nonno/a","Collega","Qualcun altro"],
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
        brandQ: "Autore preferito o cosa sta leggendo ora", brandPlaceholder: "ama Murakami, sta leggendo una serie fantasy…",
      },
      4: {
        detailQ: "Che tipo di giochi preferisce?", detailPlaceholder: "action/avventura, strategia, sportivi, indie, retro…",
        contextQ: "Su cosa gioca di più?", contextOpts: ["PC","Console","Mobile"],
        levelQ: "Che tipo di giocatore/giocatrice è?", levelOpts: ["Gioca per rilassarsi","Giocatore/giocatrice appassionato/a","Livello competitivo/hardcore"],
        brandQ: "Piattaforma/brand che ama o cosa ha già", brandPlaceholder: "PlayStation, ha già una tastiera meccanica…",
      },
      5: {
        detailQ: "Che genere ascolta di più?", detailPlaceholder: "pop, rock, jazz, classica, elettronica, hip-hop…",
        contextQ: "Come vive la musica?", contextOpts: ["Solo ascolto","Suona uno strumento","Va a concerti spesso"],
        levelQ: "Quanto è appassionato/a?", levelOpts: ["Ascolta per svago","Vero/a appassionato/a o collezionista","Musicista/DJ"],
        brandQ: "Artista preferito o attrezzatura che ha già", brandPlaceholder: "ama i Radiohead, ha già delle cuffie base…",
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
        brandQ: "Brand che ama o cosa ha già", brandPlaceholder: "ama Sony, ha già delle cuffie Bose…",
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
  },
  fr: {
    nav:["Accueil","Historique","Favoris","Contact"],
    h1a:"Le cadeau parfait,", h1b:"trouvé pour vous.",
    intro:"Répondez à quelques questions rapides et Gifty — votre concierge personnel — trouvera le cadeau parfait pour vous.",
    bFree:"Gratuit · Sans compte · ~2 minutes", bBudget:"Tous les budgets, toutes les occasions", bSocial:"Lit leurs réseaux publics pour de vrais indices",
    proofPre:"Adoré par", proofPost:"offreurs attentionnés",
    stepWord:"Étape", ofWord:"sur",
    stepNames:["Pour qui ?","L'occasion","Le destinataire et budget","Ses centres d'intérêt","Entrons dans le détail","Quelques détails"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Pour qui cherchons-nous un cadeau ?",`Très bien. Quelle est l'occasion pour ${n} ?`,`Et qui est ${n} pour vous — quel âge a-t-il environ, et quel est votre budget ?`,`Qu'est-ce qui plaît à ${n} ? Choisissez tout ce qui correspond.`,"Entrons un peu plus dans le détail — ça fait une grande différence.",`Dernière chose : autre chose à savoir sur ${n} ?`],
    namePlaceholder:"Son prénom…", nameHelp:"Le prénom aide Gifty à deviner le genre probable et à personnaliser les suggestions.",
    relTitle:"Votre relation", ageQ:"Quel âge a-t-il environ ?",
    yrs:"ans",
    otherLabel:"Autre…", customPlaceholder:"ex. Formule 1, yoga, vin, voitures vintage…",
    pickAtLeast:"Choisissez-en au moins un", selectedWord:"sélectionné(s)",
    budgetTitle:"Budget",
    detailsPlaceholder:"ex. Elle vient d'emménager dans son premier appartement et adore recevoir. Elle a déjà plein de bougies…",
    promptChips:["Il a déjà…","Aime une marque en particulier","Cadeau private joke"],
    back:"Retour", continue:"Continuer →", findGifts:"Trouver mes cadeaux ✨",
    loadingTitle:"Gifty fait sa sélection…",
    loadingLines:["Lecture du profil social…","Analyse des légendes, hashtags et posts…","Mise en correspondance avec les goûts et le budget…","Classement des meilleures trouvailles…"],
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
    rel:["Partenaire","Parent","Frère/Sœur","Ami(e)","Meilleur(e) ami(e)","Enfant","Grand-parent","Collègue","Quelqu'un d'autre"],
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
  },
  de: {
    nav:["Start","Verlauf","Favoriten","Kontakt"],
    h1a:"Das perfekte Geschenk,", h1b:"für dich gefunden.",
    intro:"Beantworte ein paar kurze Fragen und Gifty — dein persönlicher Concierge — findet das perfekte Geschenk für dich.",
    bFree:"Kostenlos · Kein Konto · ~2 Minuten", bBudget:"Jedes Budget, jeder Anlass", bSocial:"Liest öffentliche Profile für echte Hinweise",
    proofPre:"Geliebt von", proofPost:"aufmerksamen Schenkern",
    stepWord:"Schritt", ofWord:"von",
    stepNames:["Für wen?","Der Anlass","Die Person & Budget","Interessen","Ins Detail gehen","Ein paar Details"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Für wen suchen wir ein Geschenk?",`Alles klar. Was ist der Anlass für ${n}?`,`Und wer ist ${n} für dich — wie alt ungefähr, und was ist dein Budget?`,`Worauf steht ${n}? Wähle alles, was passt.`,"Lass uns etwas genauer werden — das macht einen großen Unterschied.",`Zum Schluss: noch etwas, das ich über ${n} wissen sollte?`],
    namePlaceholder:"Ihr Vorname…", nameHelp:"Der Name hilft Gifty, das wahrscheinliche Geschlecht zu erkennen und Vorschläge anzupassen.",
    relTitle:"Deine Beziehung", ageQ:"Wie alt ungefähr?",
    yrs:"J.",
    otherLabel:"Anderes…", customPlaceholder:"z.B. Formel 1, Yoga, Wein, Oldtimer…",
    pickAtLeast:"Wähle mindestens eins", selectedWord:"ausgewählt",
    budgetTitle:"Budget",
    detailsPlaceholder:"z.B. Sie ist gerade in ihre erste Wohnung gezogen und liebt es, Dinnerpartys zu geben. Hat schon viele Kerzen…",
    promptChips:["Hat schon…","Liebt eine bestimmte Marke","Insider-Geschenk"],
    back:"Zurück", continue:"Weiter →", findGifts:"Geschenke finden ✨",
    loadingTitle:"Gifty kuratiert…",
    loadingLines:["Social-Profil wird gelesen…","Bildunterschriften, Hashtags & Posts werden ausgewertet…","Abgleich mit Interessen & Budget…","Beste Funde werden sortiert…"],
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
    rel:["Partner","Elternteil","Geschwister","Freund/in","Beste/r Freund/in","Kind","Großelternteil","Kollege","Jemand anderes"],
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
  },
  es: {
    nav:["Inicio","Historial","Favoritos","Contacto"],
    h1a:"El regalo perfecto,", h1b:"encontrado para ti.",
    intro:"Responde unas preguntas rápidas y Gifty — tu concierge personal — encontrará el regalo perfecto para ti.",
    bFree:"Gratis · Sin cuenta · ~2 minutos", bBudget:"Cada presupuesto, cada ocasión", bSocial:"Lee sus redes públicas para pistas reales",
    proofPre:"Amado por", proofPost:"regaladores atentos",
    stepWord:"Paso", ofWord:"de",
    stepNames:["¿Para quién?","La ocasión","El destinatario y presupuesto","Sus intereses","Vamos al detalle","Algunos detalles"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["¿Para quién buscamos un regalo?",`Perfecto. ¿Cuál es la ocasión para ${n}?`,`¿Y quién es ${n} para ti — qué edad tiene más o menos, y cuál es tu presupuesto?`,`¿Qué le gusta a ${n}? Elige todo lo que encaje.`,"Vamos a entrar un poco más en detalle — marca una gran diferencia.",`Última cosa: ¿algo más que deba saber sobre ${n}?`],
    namePlaceholder:"Su nombre…", nameHelp:"El nombre ayuda a Gifty a deducir el género probable y personalizar las sugerencias.",
    relTitle:"Tu relación", ageQ:"¿Qué edad tiene más o menos?",
    yrs:"años",
    otherLabel:"Otro…", customPlaceholder:"ej. Fórmula 1, yoga, vino, coches clásicos…",
    pickAtLeast:"Elige al menos uno", selectedWord:"seleccionados",
    budgetTitle:"Presupuesto",
    detailsPlaceholder:"ej. Acaba de mudarse a su primer apartamento y le encanta organizar cenas. Ya tiene muchas velas…",
    promptChips:["Ya tiene…","Le encanta una marca","Regalo de broma interna"],
    back:"Atrás", continue:"Continuar →", findGifts:"Buscar regalos ✨",
    loadingTitle:"Gifty está seleccionando…",
    loadingLines:["Leyendo el perfil social…","Analizando pies de foto, hashtags y posts…","Comparando con intereses y presupuesto…","Ordenando los mejores hallazgos…"],
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
    rel:["Pareja","Padre/Madre","Hermano/a","Amigo/a","Mejor amigo/a","Hijo/a","Abuelo/a","Colega","Alguien más"],
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
  },
  pt: {
    nav:["Início","Histórico","Favoritos","Contato"],
    h1a:"O presente perfeito,", h1b:"encontrado para você.",
    intro:"Responda a algumas perguntas rápidas e Gifty — o seu concierge pessoal — encontrará o presente perfeito para você.",
    bFree:"Grátis · Sem conta · ~2 minutos", bBudget:"Cada orçamento, cada ocasião", bSocial:"Lê as redes públicas para pistas reais",
    proofPre:"Amado por", proofPost:"presenteadores atentos",
    stepWord:"Passo", ofWord:"de",
    stepNames:["Para quem?","A ocasião","O destinatário e orçamento","Os interesses","Vamos ao detalhe","Alguns detalhes"],
    conciergeLabel:"GIFTY",
    msgs:(n)=>["Para quem procuramos um presente?",`Certo. Qual é a ocasião para ${n}?`,`E quem é ${n} para você — que idade tem mais ou menos, e qual é o seu orçamento?`,`Do que ${n} gosta? Escolha tudo o que combina.`,"Vamos entrar um pouco mais no detalhe — faz uma grande diferença.",`Última coisa: algo mais que eu deva saber sobre ${n}?`],
    namePlaceholder:"O seu nome…", nameHelp:"O nome ajuda o Gifty a identificar o género provável e a personalizar as sugestões.",
    relTitle:"A sua relação", ageQ:"Que idade tem mais ou menos?",
    yrs:"anos",
    otherLabel:"Outro…", customPlaceholder:"ex. Fórmula 1, yoga, vinho, carros vintage…",
    pickAtLeast:"Escolha pelo menos um", selectedWord:"selecionados",
    budgetTitle:"Orçamento",
    detailsPlaceholder:"ex. Acabou de mudar para o seu primeiro apartamento e adora receber convidados. Já tem muitas velas…",
    promptChips:["Já tem…","Adora uma marca específica","Presente de piada interna"],
    back:"Voltar", continue:"Continuar →", findGifts:"Encontrar presentes ✨",
    loadingTitle:"Gifty está a selecionar…",
    loadingLines:["A ler o perfil social…","A analisar legendas, hashtags e posts…","A comparar com interesses e orçamento…","A ordenar as melhores descobertas…"],
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
    rel:["Parceiro/a","Pai / Mãe","Irmão/ã","Amigo/a","Melhor amigo/a","Filho/a","Avô / Avó","Colega","Outra pessoa"],
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
  age: number;
  interests: string[];
  customInterest: string;
  showOther: boolean;
  budget: number;
  details: string;
  interestDeepDive: Partial<Record<number, InterestDeepDiveAnswer>>;
}

const EMPTY: Gathered = {
  recipientName:"", occasion:null, relationship:"", age:30,
  interests:[], customInterest:"", showOther:false, budget:75, details:"", interestDeepDive:{},
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtAge(a: number) { return a <= 2 ? `${a} yr` : a >= 90 ? "90+" : `${a}`; }
function fmtBudget(b: number, sym: string) { return b >= 500 ? `${sym}500+` : `${sym}${b}`; }
function parsePriceLow(r: string): number { const m = r.replace(/[, ]/g,"").match(/\d+/); return m ? parseInt(m[0]) : 9999; }

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
            type="text"
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

/* ═══════════════════════════ COMPONENT ══════════════════════════ */
/* ─── Custom sign-in page ────────────────────────────────────── */
function CustomSignIn({ onGuest, langIdx, setLangIdx, tr }: {
  onGuest: () => void;
  langIdx: number;
  setLangIdx: (i: number) => void;
  tr: Tr;
}) {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [email, setEmail]   = useState("");
  const [otp,   setOtp]     = useState("");
  const [stage, setStage]   = useState<"form" | "otp">("form");
  const [busy,  setBusy]    = useState(false);
  const [err,   setErr]     = useState<string | null>(null);

  const lang = LANGS[langIdx];

  const handleSocial = async (strategy: "oauth_google" | "oauth_apple" | "oauth_facebook") => {
    if (!isLoaded) return;
    setBusy(true); setErr(null);
    try {
      await signIn!.authenticateWithRedirect({
        strategy,
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: "/",
      });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    if (!isLoaded || !email) return;
    setBusy(true); setErr(null);
    try {
      const res = await signIn!.create({ identifier: email });
      const factor = res.supportedFirstFactors?.find((f: { strategy: string }) => f.strategy === "email_code") as { strategy: string; emailAddressId: string } | undefined;
      if (!factor) throw new Error("Email code not supported");
      await signIn!.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      setStage("otp");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  const handleOtp = async () => {
    if (!isLoaded || !otp) return;
    setBusy(true); setErr(null);
    try {
      const res = await signIn!.attemptFirstFactor({ strategy: "email_code", code: otp });
      if (res.status === "complete") {
        await setActive!({ session: res.createdSessionId });
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Incorrect code — try again");
    } finally { setBusy(false); }
  };

  const inputSt: React.CSSProperties = {
    width: "100%", height: 52, borderRadius: 12, border: `1.5px solid ${C.bord3}`,
    background: "#fff", color: C.ink, font: `400 15px ${BODY}`,
    padding: "0 16px", outline: "none", boxSizing: "border-box",
  };
  const socialBtn = (bg: string, color: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", height: 52, borderRadius: 12, border: bg === "#fff" ? `1.5px solid ${C.bord3}` : "none",
    background: bg, color, font: `600 15px ${BODY}`, cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1, transition: "opacity .15s",
  });

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily: BODY }}>
      {/* ── LEFT PANEL ── */}
      <aside style={{ width: 460, flexShrink: 0, background: C.brand, display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"52px 46px", position:"relative", overflow:"hidden" }}>
        {/* logo */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:90, height:90, borderRadius:24, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 6px 18px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.4)" }}>
            <GiftSVG size={52} fill="#4a2a16" />
          </div>
          <div>
            <span style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:52, letterSpacing:"-.02em", color:"#f8eee0", display:"block", lineHeight:1 }}>Gifty</span>
            <span style={{ fontSize:14, fontWeight:500, letterSpacing:".04em", color:"#d8b98c" }}>AI Gift Concierge</span>
          </div>
        </div>

        {/* headline */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:16 }}>
            <span style={{ width:26, height:1.5, background:"linear-gradient(90deg,#c9a26b,transparent)" }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase" as const, color:"#d8b98c" }}>AI-Powered Gifting</span>
          </div>
          <h1 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:42, lineHeight:1.06, letterSpacing:"-.025em", margin:"0 0 20px", color:"#f8eee0" }}>
            {tr.h1a}<br/>{tr.h1b}
          </h1>
          <p style={{ fontSize:16, lineHeight:1.6, color:"#e3cfb9", margin:"0 0 32px" }}>
            {tr.intro}
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[tr.bFree, tr.bBudget, tr.bSocial].map(txt => (
              <div key={txt} style={{ display:"flex", alignItems:"center", gap:12, fontSize:14.5, color:"#f0e3d2" }}>
                <span style={{ width:22, height:22, borderRadius:"50%", background:"rgba(201,162,107,.25)", border:"1px solid rgba(201,162,107,.4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#f0d9a8", flexShrink:0, fontSize:11 }}>✓</span>
                {txt}
              </div>
            ))}
          </div>
        </div>

        {/* social proof */}
        <div style={{ paddingTop:32, borderTop:"1px solid rgba(255,255,255,.12)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, fontSize:13.5, color:"#d8c4b0" }}>
            <div style={{ display:"flex" }}>
              {(["#c9a26b","#e8d5c4","#a8694a"] as const).map((bg, i) => (
                <span key={i} style={{ width:28, height:28, borderRadius:"50%", background:bg, border:"2.5px solid #5e2e2e", marginLeft:i ? -9 : 0 }}/>
              ))}
            </div>
            <span>{tr.proofPre} <strong style={{ color:"#fff" }}>42,000+</strong> {tr.proofPost}</span>
          </div>
          <div style={{ marginTop:14, fontSize:12.5, color:"#e8d5c4", background:"rgba(0,0,0,.18)", border:"1px solid rgba(255,255,255,.1)", borderRadius:999, padding:"6px 14px", display:"inline-flex", alignItems:"center", gap:6 }}>
            {lang.flag} {lang.code} · {lang.currency} ({lang.sym}) · {lang.country}
          </div>
        </div>
      </aside>

      {/* ── RIGHT PANEL ── */}
      <main style={{ flex:1, background: C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 40px", position:"relative" }}>
        {/* Language picker top-right */}
        <div style={{ position:"absolute", top:20, right:24 }}>
          <select
            value={langIdx}
            onChange={e => setLangIdx(Number(e.target.value))}
            style={{ padding:"7px 12px", borderRadius:999, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.label, font:`600 13px ${BODY}`, cursor:"pointer", outline:"none" }}
          >
            {LANGS.map((l, i) => (
              <option key={i} value={i}>{l.flag} {l.code} · {l.currency}</option>
            ))}
          </select>
        </div>
        <div style={{ width:"100%", maxWidth:420 }}>
          {/* icon */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
            <div style={{ width:68, height:68, borderRadius:18, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(124,63,63,.28)" }}>
              <GiftSVG size={38} fill="#4a2a16" />
            </div>
          </div>

          {stage === "form" ? (
            <>
              <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:28, color:C.ink, textAlign:"center", margin:"0 0 8px" }}>{tr.signInTitle}</h2>
              <p style={{ fontSize:14.5, color:C.label, textAlign:"center", margin:"0 0 32px", lineHeight:1.5 }}>
                {tr.signInSub}
              </p>

              {/* Social buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                <button style={socialBtn("#fff", C.ink)} onClick={() => handleSocial("oauth_google")} disabled={busy}>
                  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  {tr.continueGoogle}
                </button>

              </div>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:12, margin:"4px 0 20px" }}>
                <span style={{ flex:1, height:1, background:C.bord3 }}/>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:C.muted2 }}>{tr.orWord}</span>
                <span style={{ flex:1, height:1, background:C.bord3 }}/>
              </div>

              {/* Email */}
              <input
                type="email" placeholder="you@email.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleEmail()}
                style={inputSt}
              />
              <button
                onClick={handleEmail} disabled={busy || !email}
                style={{ ...socialBtn(email ? C.goldS : C.bord3, email ? C.label2 : C.muted2), marginTop:10, cursor: email && !busy ? "pointer" : "not-allowed" }}
              >
                {busy ? tr.waitMsg : tr.continueEmail}
              </button>

              {err && <p style={{ color:"#c0392b", fontSize:13, textAlign:"center", margin:"12px 0 0" }}>{err}</p>}

              <div style={{ textAlign:"center", marginTop:20 }}>
                <button onClick={onGuest} style={{ background:"none", border:"none", cursor:"pointer", color:C.maroon, font:`600 14px ${BODY}`, textDecoration:"underline" }}>
                  {tr.continueGuest}
                </button>
              </div>

              <p style={{ fontSize:12, color:C.muted2, textAlign:"center", margin:"16px 0 0", lineHeight:1.5 }}>
                {tr.termsNote}
              </p>
            </>
          ) : (
            /* OTP stage */
            <>
              <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:26, color:C.ink, textAlign:"center", margin:"0 0 8px" }}>{tr.checkEmail}</h2>
              <p style={{ fontSize:14.5, color:C.label, textAlign:"center", margin:"0 0 28px", lineHeight:1.5 }}>
                {tr.codeSent} <strong>{email}</strong>
              </p>
              <input
                type="text" placeholder="123456" value={otp} maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g,""))}
                onKeyDown={e => e.key === "Enter" && handleOtp()}
                style={{ ...inputSt, textAlign:"center", letterSpacing:".3em", fontSize:22, fontWeight:600 }}
              />
              <button
                onClick={handleOtp} disabled={busy || otp.length < 6}
                style={{ ...socialBtn(otp.length === 6 ? C.maroon : C.bord3, otp.length === 6 ? "#fff" : C.muted2), marginTop:10 }}
              >
                {busy ? tr.verifying : tr.verifyCode}
              </button>
              {err && <p style={{ color:"#c0392b", fontSize:13, textAlign:"center", margin:"12px 0 0" }}>{err}</p>}
              <div style={{ textAlign:"center", marginTop:16 }}>
                <button onClick={() => { setStage("form"); setOtp(""); setErr(null); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted3, font:`400 13px ${BODY}` }}>
                  ← Back
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [view,        setView]        = useState<"app"|"history"|"favorites"|"contact">("app");
  const [screen,      setScreen]      = useState<"intake"|"loading"|"results">("intake");
  const [step,        setStep]        = useState(0);
  const [stepKey,     setStepKey]     = useState(0);
  const [g,           setG]           = useState<Gathered>(EMPTY);
  const [gifts,       setGifts]       = useState<GiftSuggestion[]>([]);
  const [sortBy,      setSortBy]      = useState<"match"|"price"|"priceHigh">("match");
  const [loadingLine, setLoadingLine] = useState(0);
  const [langIdx,     setLangIdx]     = useState(2); // default: Italian (testing phase — Amazon affiliate is IT-only)
  const [langMenuOpen,setLangMenuOpen]= useState(false);
  const [favorites,   setFavorites]   = useState<GiftSuggestion[]>([]);
  const [sessionFavs, setSessionFavs] = useState<GiftSuggestion[]>([]);
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

  const [isGuest, setIsGuest] = useState(false);
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lang = LANGS[langIdx];
  const tr   = TR[lang.t as TKey] ?? TR.en;
  const sym  = lang.sym;

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
      const favs = localStorage.getItem("gifty-favorites");
      if (favs) setFavorites(JSON.parse(favs));
      const hist = localStorage.getItem("gifty-history");
      if (hist) setHistory(JSON.parse(hist));
    } catch { /* ignore */ }
  }, []);

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

  /* ── Favorites helpers ── */
  function isFav(id: string) { return favorites.some(f => f.id === id); }
  function toggleFav(gift: GiftSuggestion) {
    const adding = !favorites.some(f => f.id === gift.id);
    setFavorites(prev => {
      const next = adding ? [...prev, gift] : prev.filter(f => f.id !== gift.id);
      try { localStorage.setItem("gifty-favorites", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setSessionFavs(prev => adding ? [...prev, gift] : prev.filter(f => f.id !== gift.id));
  }

  /* ── Navigation ── */
  function canContinue() {
    if (step === 0) return g.recipientName.trim().length > 0;
    if (step === 1) return !!g.occasion;
    if (step === 2) return !!g.relationship;
    if (step === 3) return g.interests.length > 0 || g.customInterest.trim().length > 0;
    return true;
  }
  function hasInterestDeepDive() {
    return g.interests.some(label => {
      const idx = tr.intr.indexOf(label);
      return idx !== -1 && tr.deepDive[idx] != null;
    });
  }
  function advance() {
    if (step === 3 && !hasInterestDeepDive()) { setStep(5); setStepKey(k => k + 1); return; }
    if (step < 5) { setStep(s => s + 1); setStepKey(k => k + 1); } else fireRequest();
  }
  function goBack() {
    if (step === 5 && !hasInterestDeepDive()) { setStep(3); setStepKey(k => k + 1); return; }
    setStep(s => Math.max(0, s - 1)); setStepKey(k => k + 1);
  }
  function restart() { setG(EMPTY); setStep(0); setStepKey(0); setGifts([]); setSortBy("match"); setScreen("intake"); setView("app"); setViewedEntry(null); setSessionFavs([]); setThumbs({}); setConvo([]); setErrorMsg(null); }
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
      try { localStorage.setItem("gifty-history", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  async function fireRequest() {
    setScreen("loading"); setLoadingLine(0); setErrorMsg(null); setSessionFavs([]);
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
    const fallbackLink = `https://www.google.com/search?q=${encodeURIComponent(gift.title)}`;
    const officialLink = gift.officialLink || gift.link;
    const amazonLink   = gift.amazonLink;
    const fav    = isFav(gift.id);
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
          {/* Heart / favorite button — top left */}
          <button
            onClick={() => toggleFav(gift)}
            style={{ position:"absolute", top:10, left:10, zIndex:1, display:"flex", alignItems:"center", gap:6, padding:"7px 12px 7px 10px", borderRadius:999, border:"none", background: fav ? C.maroon : "rgba(255,255,255,.94)", color: fav ? "#fff" : C.maroon, fontSize:12.5, fontWeight:600, cursor:"pointer", boxShadow:"0 2px 10px rgba(124,63,63,.25)", transition:"all .15s", whiteSpace:"nowrap" as const }}>
            <span style={{ fontSize:14 }}>{fav ? "♥" : "♡"}</span>
            {fav ? tr.savedFav : tr.saveFav}
          </button>
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
                  <span style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:20, color: overBudget ? "#c0392b" : C.ink }}>{gift.priceRange}</span>
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
  const showApp       = view === "app";
  const showHistory   = view === "history";
  const showFavorites = view === "favorites";
  const showContact   = view === "contact";

  /* ── Loading screen ── */
  if (!authLoaded) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#f8f5f0", fontFamily:BODY }}>
        <style suppressHydrationWarning>{`
          @keyframes giftPop {
            0%, 20% { transform: scale(1) rotate(0deg); }
            35% { transform: scale(1.12) rotate(-4deg); }
            50% { transform: scale(0.97) rotate(3deg); }
            65%, 100% { transform: scale(1) rotate(0deg); }
          }
          .gc-gift-logo {
            animation: giftPop 2s ease-in-out infinite;
          }
          .gc-confetti-burst {
            position: absolute;
            border-radius: 2px;
            pointer-events: none;
            top: 50%;
            left: 50%;
            opacity: 0;
          }
          ${Array.from({length: 14}, (_, i) => {
            const angle = (360 / 14) * i + (Math.random() - 0.5) * 20;
            const distance = 60 + Math.random() * 35;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * distance;
            const y = Math.sin(rad) * distance;
            const rot = 180 + Math.random() * 360;
            return `
              @keyframes burst-${i} {
                0%, 30% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
                38% { opacity: 1; }
                75% { transform: translate(${x}px, ${y}px) rotate(${rot}deg); opacity: 1; }
                100% { transform: translate(${x * 1.1}px, ${y * 1.1 + 15}px) rotate(${rot}deg); opacity: 0; }
              }
              .gc-confetti-${i} { animation: burst-${i} 2s ease-out infinite; }
            `;
          }).join('')}
        `}</style>
        <div style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:28 }}>
          <div style={{ position:"relative", width:100, height:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {/* Confetti bursting out from behind the logo */}
            {Array.from({length: 14}, (_, i) => (
              <div key={i} className={`gc-confetti-burst gc-confetti-${i}`} style={{
                width: 6 + (i % 3) * 2,
                height: 6 + (i % 3) * 2,
                background: [C.maroon, "#d8b98c", "#c9a26b", "#e3c089"][i % 4],
                zIndex: 1,
              }}/>
            ))}
            {/* Gift logo — same as app logo */}
            <div className="gc-gift-logo" style={{ position:"relative", zIndex:2, width:68, height:68, borderRadius:18, background:"linear-gradient(150deg,#e3c089,#c9a26b)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(124,63,63,.3)" }}>
              <GiftSVG size={38} fill="#4a2a16" />
            </div>
          </div>
          <p style={{ fontSize:15, color:"#8b6f47", textAlign:"center", fontWeight:500 }}>Refreshing page…</p>
        </div>
      </div>
    );
  }

  /* ── Sign-in gate ── */
  if (authLoaded && !isSignedIn && !isGuest) {
    return (
      <>
        <style suppressHydrationWarning>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        `}</style>
        <CustomSignIn onGuest={() => setIsGuest(true)} langIdx={langIdx} setLangIdx={setLangIdx} tr={tr} />
      </>
    );
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes gcfade  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        @keyframes gcorbit { to{transform:rotate(360deg)} }
        @keyframes gcpulse { 0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)} }
        @keyframes gcbob   { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
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
        @media(max-width:900px){.gc-brand{display:none!important}.gc-main{padding:24px 20px 40px!important}.gc-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:C.bg, color:C.ink, fontFamily:BODY }}>

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

          {/* Session favorites */}
          {sessionFavs.length > 0 && (
            <div className="gc-fade" style={{ position:"relative" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" as const, color:"#d8b98c", marginBottom:10 }}>
                ♥ {tr.savedSearch} ({sessionFavs.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {sessionFavs.slice(0, 4).map(f => (
                  <div key={f.id} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"7px 9px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.imageUrl || `/api/product-image?q=${encodeURIComponent(f.imageSearchQuery ?? f.title)}`} alt={f.title}
                      style={{ width:30, height:30, borderRadius:7, objectFit:"cover", flexShrink:0 }} />
                    <span style={{ fontSize:12.5, color:"#f0e3d2", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>{f.title}</span>
                  </div>
                ))}
                {sessionFavs.length > 4 && (
                  <span style={{ fontSize:11.5, color:"#d8c4b0" }}>+{sessionFavs.length - 4} more</span>
                )}
              </div>
            </div>
          )}


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
          </div>
        </aside>

        {/* ══ MAIN COLUMN ══════════════════════════════════════ */}
        <main className="gc-main" style={{ flex:1, padding:"40px 56px 56px", display:"flex", flexDirection:"column", minWidth:0, position:"relative", overflowY:"auto", height:"100vh" }}>

          {/* Top nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:6, marginBottom:18 }}>
            <nav style={{ display:"flex", alignItems:"center", gap:2, marginRight:6 }}>
              {tr.nav.map((label, i) => {
                const views: Array<"app"|"history"|"favorites"|"contact"> = ["app","history","favorites","contact"];
                const active = view === views[i];
                const isFavsTab = i === 2;
                return (
                  <button key={label} onClick={() => setView(views[i])}
                    style={{ display:"flex", alignItems:"center", padding:"8px 14px", borderRadius:999, border:"none", background: active ? C.goldS : "transparent", color: active ? C.maroon : C.muted4, font:`${active?600:500} 13.5px ${BODY}`, cursor:"pointer", transition:"all .15s" }}>
                    {label}
                    {isFavsTab && favorites.length > 0 && (
                      <span style={{ marginLeft:6, background:C.maroon, color:"#fff", fontSize:11, fontWeight:700, padding:"1px 7px", borderRadius:999 }}>{favorites.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>
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

            {/* My profile */}
            <SignedIn>
              <UserButton showName />
            </SignedIn>
            {isGuest && (
              <SignInButton mode="modal">
                <button style={{ padding:"8px 16px", borderRadius:999, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.label2, font:`600 13.5px ${BODY}`, cursor:"pointer" }}>
                  My profile
                </button>
              </SignInButton>
            )}
          </div>

          {/* ══ HOME / APP ══ */}
          {showApp && (
            <>
              <>
              {/* INTAKE */}
              {screen === "intake" && (
                <div style={{ maxWidth:640, width:"100%", margin:"0 auto", flex:1, display:"flex", flexDirection:"column" }}>
                  {/* Progress */}
                  <div style={{ marginBottom:30 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:9 }}>
                      <span style={{ fontSize:13, fontWeight:600, letterSpacing:".04em", textTransform:"uppercase" as const, color:C.muted3 }}>{tr.stepWord} {step+1} {tr.ofWord} 6</span>
                      <span style={{ fontSize:13, color:C.muted2 }}>{tr.stepNames[step]}</span>
                    </div>
                    <div style={{ height:6, background:C.bord3, borderRadius:999, overflow:"hidden" }}>
                      <div style={{ height:"100%", background:"linear-gradient(90deg,#c9a26b,#7c3f3f)", borderRadius:999, width:`${((step+1)/6)*100}%`, transition:"width .45s cubic-bezier(.4,0,.2,1)" }}/>
                    </div>
                  </div>

                  {/* Concierge bubble */}
                  <div key={`bubble-${stepKey}`} className="gc-fade" style={{ display:"flex", gap:14, marginBottom:26, alignItems:"flex-start" }}>
                    <div style={{ flexShrink:0, width:46, height:46, borderRadius:"50%", background:"linear-gradient(140deg,#7c3f3f,#a8694a)", display:"flex", alignItems:"center", justifyContent:"center", color:"#f3e7d8", fontFamily:DISPLAY, fontWeight:600, fontSize:19, boxShadow:"0 4px 12px rgba(124,63,63,.25)" }}>G</div>
                    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:"4px 18px 18px 18px", padding:"15px 19px", boxShadow:"0 2px 10px rgba(124,63,63,.05)" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:C.gold, letterSpacing:".03em", marginBottom:3 }}>{tr.conciergeLabel}</div>
                      <div style={{ fontSize:17, lineHeight:1.45, color:C.body, fontWeight:500 }}>{tr.msgs(g.recipientName || "them")[step]}</div>
                    </div>
                  </div>

                  {/* Step content */}
                  <div key={`content-${stepKey}`} className="gc-fade" style={{ flex:1 }}>

                    {/* Step 0 — Name */}
                    {step === 0 && (
                      <div>
                        <input
                          type="text" autoFocus
                          value={g.recipientName}
                          onChange={e => setG(p => ({ ...p, recipientName: e.target.value }))}
                          onKeyDown={e => { if (e.key === "Enter" && canContinue()) advance(); }}
                          placeholder={tr.namePlaceholder}
                          style={{ width:"100%", padding:"14px 16px", border:`1.5px solid ${C.bord3}`, borderRadius:14, fontFamily:BODY, fontSize:16, fontWeight:500, color:C.ink, background:"#fff", boxSizing:"border-box" as const }}
                        />
                        <p style={{ marginTop:12, fontSize:13, color:C.muted2, lineHeight:1.5 }}>{tr.nameHelp}</p>
                      </div>
                    )}

                    {/* Step 1 — Occasion */}
                    {step === 1 && (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:11 }}>
                        {OCC_IDS.map(id => (
                          <button key={id} onClick={() => setG(p => ({ ...p, occasion: id }))} style={tileSt(g.occasion === id)}>
                            <span style={{ fontSize:24 }}>{OCC_EMOJI[id]}</span>
                            <span>{tr.occ[id]}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Step 2 — Relationship + Age */}
                    {step === 2 && (
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:C.label, marginBottom:11 }}>{tr.relTitle}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:9, marginBottom:30 }}>
                          {tr.rel.map((r, i) => (
                            <button key={i} onClick={() => setG(p => ({ ...p, relationship: r }))} style={chipSt(g.relationship === r)}>{r}</button>
                          ))}
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.label }}>{tr.ageQ}</span>
                        </div>
                        <input type="number" min={1} max={99} step={1} value={g.age}
                          onChange={e => {
                            const v = e.target.value === "" ? 0 : Math.max(1, Math.min(99, +e.target.value));
                            setG(p => ({ ...p, age: v }));
                          }}
                          placeholder={tr.yrs}
                          style={{ width:120, padding:"11px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:DISPLAY, fontWeight:600, fontSize:18, color:C.ink, background:"#fff", boxSizing:"border-box" as const }}
                        />
                        <span style={{ marginLeft:10, fontSize:14, color:C.muted2 }}>{tr.yrs}</span>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", margin:"26px 0 12px" }}>
                          <span style={{ fontSize:14, fontWeight:600, color:C.label }}>{tr.budgetTitle}</span>
                          <span style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:22, color:C.maroon }}>{fmtBudget(g.budget, sym)}</span>
                        </div>
                        <input type="range" min={10} max={500} step={5} value={g.budget}
                          onChange={e => setG(p => ({ ...p, budget: +e.target.value }))}
                          style={{ width:"100%", background:`linear-gradient(90deg,${C.maroon} ${((g.budget-10)/490)*100}%,#e3d4c2 ${((g.budget-10)/490)*100}%)` }}
                        />
                        {/* Tick labels positioned at exact % matching the linear 10-500 scale */}
                        <div style={{ position:"relative", height:18, marginTop:5 }}>
                          {([10,100,250,500] as const).map(v => (
                            <span key={v} style={{ position:"absolute", left:`${((v-10)/490)*100}%`, transform:"translateX(-50%)", fontSize:12, color:C.muted2, whiteSpace:"nowrap" as const }}>
                              {v === 500 ? `${sym}500+` : `${sym}${v}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Step 3 — Interests */}
                    {step === 3 && <InterestsStep g={g} setG={setG} tr={tr} />}

                    {/* Step 4 — Interest deep-dive */}
                    {step === 4 && <InterestDeepDiveStep g={g} setG={setG} tr={tr} />}

                    {/* Step 5 — Details */}
                    {step === 5 && (
                      <div>
                        <textarea
                          value={g.details}
                          onChange={e => setG(p => ({ ...p, details: e.target.value }))}
                          placeholder={tr.detailsPlaceholder}
                          style={{ width:"100%", minHeight:130, resize:"vertical", padding:"16px 18px", border:`1.5px solid ${C.bord3}`, borderRadius:14, background:"#fff", fontFamily:BODY, fontSize:16, lineHeight:1.5, color:C.body, boxSizing:"border-box" as const }}
                        />
                        <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:8 }}>
                          {tr.promptChips.map(pc => (
                            <button key={pc}
                              onClick={() => setG(prev => ({ ...prev, details: prev.details ? prev.details + " " + pc + " " : pc + " " }))}
                              style={{ padding:"7px 13px", borderRadius:999, border:"1px dashed #d6c3ad", background:"#fbf6ef", color:C.muted, font:`500 13px ${BODY}`, cursor:"pointer" }}>
                              + {pc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nav */}
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginTop:34, paddingTop:22, borderTop:`1px solid ${C.bord4}` }}>
                    {step > 0 && (
                      <button onClick={goBack} style={{ padding:"13px 20px", borderRadius:12, border:`1.5px solid ${C.bord5}`, background:"transparent", color:C.muted4, font:`600 15px ${BODY}`, cursor:"pointer" }}>
                        ← {tr.back}
                      </button>
                    )}
                    <div style={{ flex:1 }}/>
                    <button onClick={advance} disabled={!canContinue()} style={canContinue() ? btnPrimary : btnDisabled}>
                      {step === 5 ? tr.findGifts : tr.continue}
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
                    {(["match","price","priceHigh"] as const).map((s, i) => (
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
              </>
            </>
          )}

          {/* ══ HISTORY ══ */}
          {showHistory && (
            <div className="gc-fade" style={{ maxWidth:760, width:"100%", margin:"0 auto" }}>
              <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:30, lineHeight:1.12, color:C.ink, margin:"0 0 6px", letterSpacing:"-.02em" }}>{tr.histTitle}</h2>
              <p style={{ fontSize:15.5, color:C.muted, margin:"0 0 26px" }}>{tr.histSub}</p>

              {history.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {history.map(h => (
                    <div key={h.id} style={{ display:"flex", alignItems:"center", gap:16, background:"#fff", border:`1px solid ${C.border}`, borderRadius:16, padding:"16px 18px", boxShadow:"0 2px 10px rgba(124,63,63,.04)" }}>
                      <div style={{ flexShrink:0, width:48, height:48, borderRadius:13, background:C.goldS, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{h.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:17, color:C.ink }}>{tr.histRow(h.name, tr.occ[h.occId] ?? h.occId)}</div>
                        <div style={{ fontSize:13, color:C.muted2, marginTop:2 }}>{h.count} {tr.giftsWord} · {tr.budgetWord} {fmtBudget(h.budgetVal, sym)} · {whenLabel(h.when)}</div>
                      </div>
                      <button onClick={() => { setViewedEntry(h); setScreen("results"); setView("app"); }}
                        style={{ flexShrink:0, padding:"9px 16px", borderRadius:10, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.maroon, font:`600 13.5px ${BODY}`, cursor:"pointer" }}>
                        {tr.viewResults}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", border:`1px dashed ${C.bord3}`, borderRadius:18 }}>
                  <div style={{ fontSize:38, marginBottom:12 }}>🔍</div>
                  <div style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:19, color:C.ink, marginBottom:6 }}>{tr.histEmptyTitle}</div>
                  <p style={{ fontSize:14, color:C.muted, margin:"0 0 20px" }}>{tr.histEmptySub}</p>
                  <button onClick={() => setView("app")} style={{ padding:"12px 22px", borderRadius:12, border:"none", background:C.maroon, color:"#fff", font:`600 14.5px ${BODY}`, cursor:"pointer" }}>
                    {tr.startSearch}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ FAVORITES ══ */}
          {showFavorites && (
            <div className="gc-fade" style={{ maxWidth:980, width:"100%", margin:"0 auto" }}>
              <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:30, lineHeight:1.12, color:C.ink, margin:"0 0 6px", letterSpacing:"-.02em" }}>{tr.favTitle}</h2>
              <p style={{ fontSize:15.5, color:C.muted, margin:"0 0 26px" }}>{tr.favSub}</p>

              {favorites.length > 0 ? (
                <div className="gc-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
                  {favorites.map(gift => <GiftCard key={gift.id} gift={gift} />)}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"60px 20px", background:"#fff", border:`1px dashed ${C.bord3}`, borderRadius:18 }}>
                  <div style={{ fontSize:38, marginBottom:12 }}>🤍</div>
                  <div style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:19, color:C.ink, marginBottom:6 }}>{tr.favEmptyTitle}</div>
                  <p style={{ fontSize:14, color:C.muted, margin:"0 0 20px" }}>{tr.favEmptySub}</p>
                  <button onClick={() => setView("app")} style={{ padding:"12px 22px", borderRadius:12, border:"none", background:C.maroon, color:"#fff", font:`600 14.5px ${BODY}`, cursor:"pointer" }}>
                    {tr.findGiftsBtn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ CONTACT ══ */}
          {showContact && (
            <div className="gc-fade" style={{ maxWidth:560, width:"100%", margin:"0 auto" }}>
              <h2 style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:30, lineHeight:1.12, color:C.ink, margin:"0 0 6px", letterSpacing:"-.02em" }}>{tr.contactTitle}</h2>
              <p style={{ fontSize:15.5, color:C.muted, margin:"0 0 26px" }}>{tr.contactSub}</p>

              {contactSent ? (
                <div style={{ textAlign:"center", padding:"50px 24px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:18, boxShadow:"0 4px 18px rgba(124,63,63,.06)" }}>
                  <div style={{ width:56, height:56, borderRadius:"50%", background:C.goldS, color:C.maroon, fontSize:26, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>✓</div>
                  <div style={{ fontFamily:DISPLAY, fontWeight:600, fontSize:20, color:C.ink, marginBottom:6 }}>{tr.sentTitle}</div>
                  <p style={{ fontSize:14.5, color:C.muted, margin:"0 0 22px" }}>{tr.sentSub}</p>
                  <button onClick={() => { setContactSent(false); setCName(""); setCEmail(""); setCMsg(""); }}
                    style={{ padding:"11px 20px", borderRadius:11, border:`1.5px solid ${C.bord3}`, background:"#fff", color:C.maroon, font:`600 14px ${BODY}`, cursor:"pointer" }}>
                    {tr.sendAnother}
                  </button>
                </div>
              ) : (
                <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:18, padding:26, boxShadow:"0 4px 18px rgba(124,63,63,.06)", display:"flex", flexDirection:"column", gap:16 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.label, marginBottom:7 }}>{tr.yourName}</div>
                    <input type="text" value={cName} onChange={e => setCName(e.target.value)} placeholder={tr.namePh}
                      style={{ width:"100%", padding:"12px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:BODY, fontSize:15, color:C.body, background:"#fff", boxSizing:"border-box" as const }} />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.label, marginBottom:7 }}>{tr.email}</div>
                    <input type="email" value={cEmail} onChange={e => setCEmail(e.target.value)} placeholder="you@email.com"
                      style={{ width:"100%", padding:"12px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:BODY, fontSize:15, color:C.body, background:"#fff", boxSizing:"border-box" as const }} />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.label, marginBottom:7 }}>{tr.help}</div>
                    <textarea value={cMsg} onChange={e => setCMsg(e.target.value)} placeholder={tr.msgPh}
                      style={{ width:"100%", minHeight:120, resize:"vertical", padding:"13px 15px", border:`1.5px solid ${C.bord3}`, borderRadius:12, fontFamily:BODY, fontSize:15, lineHeight:1.5, color:C.body, background:"#fff", boxSizing:"border-box" as const }} />
                  </div>
                  <button
                    disabled={!cName.trim() || !cEmail.trim() || !cMsg.trim()}
                    onClick={() => setContactSent(true)}
                    style={cName.trim() && cEmail.trim() && cMsg.trim() ? btnPrimary : btnDisabled}>
                    {tr.sendMsg}
                  </button>
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.muted, paddingTop:4, borderTop:`1px solid #f0e8de` }}>
                    <span style={{ color:C.gold }}>✉</span> {tr.orEmail} <strong style={{ color:C.maroon }}>hello@gifty.app</strong>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
