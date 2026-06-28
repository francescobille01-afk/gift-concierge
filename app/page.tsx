"use client";

import { useState, useEffect, useRef } from "react";
import type { GiftSuggestion, ChatResponse, UserLocale } from "@/lib/types";
import {
  detectLangFromBrowser,
  t,
  tOccasion,
  type LangCode,
} from "@/lib/i18n";

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  bg:          "#f3ebe1",
  brand:       "linear-gradient(160deg,#7c3f3f 0%,#5e2e2e 60%,#4a2222 100%)",
  maroon:      "#7c3f3f",
  terra:       "#a8694a",
  gold:        "#c9a26b",
  goldSurface: "#f0e3d2",
  ink:         "#2a211d",
  body:        "#3a2e26",
  label:       "#6b5b4d",
  muted:       "#9a8674",
  muted2:      "#b3a292",
  muted3:      "#a8957f",
  border:      "#ece0d2",
  border2:     "#e9ddd0",
  border3:     "#e3d4c2",
  border4:     "#e6d8c8",
};
const DISPLAY = "'Bricolage Grotesque', sans-serif";
const BODY    = "'Hanken Grotesk', sans-serif";

/* ─── Locale helpers ────────────────────────────────────── */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€", GBP: "£", JPY: "¥", INR: "₹", BRL: "R$",
  MXN: "$", CAD: "$", AUD: "$", SEK: "kr", PLN: "zł",
  TRY: "₺", AED: "د.إ", SAR: "﷼", SGD: "$",
};
const AMAZON_DOMAINS: Record<string, string> = {
  IT:"amazon.it", DE:"amazon.de", FR:"amazon.fr", ES:"amazon.es",
  GB:"amazon.co.uk", US:"amazon.com", CA:"amazon.ca", AU:"amazon.com.au",
  JP:"amazon.co.jp", IN:"amazon.in", BR:"amazon.com.br", MX:"amazon.com.mx",
  NL:"amazon.nl", SE:"amazon.se", PL:"amazon.pl", TR:"amazon.com.tr",
  AE:"amazon.ae", SA:"amazon.sa", SG:"amazon.sg",
};
const LANG_FLAGS: Record<string, string> = {
  it:"🇮🇹", fr:"🇫🇷", de:"🇩🇪", es:"🇪🇸", pt:"🇵🇹",
};
const DEFAULT_LOCALE: UserLocale = {
  countryCode:"US", countryName:"United States",
  currency:"USD", currencySymbol:"$",
  amazonDomain:"amazon.com", language:"en",
};
function buildLocale(raw: { country_code?:string; country_name?:string; currency?:string }): UserLocale {
  const cc  = (raw.country_code ?? "US").toUpperCase();
  const cur = (raw.currency ?? "USD").toUpperCase();
  const sym = CURRENCY_SYMBOLS[cur] ?? "$";
  return {
    countryCode: cc, countryName: raw.country_name ?? "United States",
    currency: cur, currencySymbol: sym,
    amazonDomain: AMAZON_DOMAINS[cc] ?? "amazon.com",
    language: "en",
  };
}

/* ─── Static data ───────────────────────────────────────── */
const OCCASION_DATA = [
  { id:"Birthday",        emoji:"🎂" },
  { id:"Christmas",       emoji:"🎄" },
  { id:"Valentine's Day", emoji:"💝" },
  { id:"Mother's Day",    emoji:"🌸" },
  { id:"Father's Day",    emoji:"👔" },
  { id:"Graduation",      emoji:"🎓" },
  { id:"Wedding",         emoji:"💍" },
  { id:"Anniversary",     emoji:"💑" },
  { id:"Housewarming",    emoji:"🏡" },
  { id:"Baby Shower",     emoji:"👶" },
  { id:"Just Because",    emoji:"✨" },
  { id:"Other",           emoji:"🎁" },
];
const RELATIONS = [
  "Partner","Parent","Sibling","Friend",
  "Child","Grandparent","Colleague","Someone else",
];

/* Display labels for each relation, per language */
const RELATION_LABELS: Record<LangCode, string[]> = {
  en: ["Partner","Parent","Sibling","Friend","Child","Grandparent","Colleague","Someone else"],
  it: ["Partner","Genitore","Fratello/Sorella","Amico/a","Figlio/a","Nonno/a","Collega","Qualcun altro"],
  fr: ["Partenaire","Parent","Frère / Sœur","Ami(e)","Enfant","Grand-parent","Collègue","Quelqu'un d'autre"],
  de: ["Partner","Elternteil","Geschwister","Freund/in","Kind","Großelternteil","Kollege","Jemand anderes"],
  es: ["Pareja","Padre / Madre","Hermano/a","Amigo/a","Hijo/a","Abuelo/a","Colega","Alguien más"],
  pt: ["Parceiro/a","Pai / Mãe","Irmão/ã","Amigo/a","Filho/a","Avô / Avó","Colega","Outra pessoa"],
};
const INTERESTS = [
  "Cooking","Travel","Fitness","Reading",
  "Gaming","Music","Art & Design","Tech",
  "Fashion","Outdoors","Coffee","Wellness","Home","Photography",
];
const INTEREST_EXAMPLES: Record<string, string> = {
  "Cooking":      '"obsessed with Japanese food", "home chef with a KitchenAid", "loves hosting dinner parties"',
  "Travel":       '"backpacker type", "luxury hotels only", "obsessed with Japan or Italy"',
  "Fitness":      '"CrossFit fanatic", "training for a triathlon", "powerlifter"',
  "Reading":      '"reads 50+ books a year", "only fiction", "loves Stoicism"',
  "Gaming":       '"PC gaming high-end rig", "PlayStation competitive", "Nintendo fan"',
  "Music":        '"goes to every festival", "vinyl collector", "plays guitar"',
  "Art & Design": '"paints watercolours", "collects contemporary art", "graphic designer"',
  "Tech":         '"Apple ecosystem, first to upgrade", "smart home Sonos Hue", "audiophile"',
  "Fashion":      '"into Loro Piana and Brunello Cucinelli", "streetwear Supreme Palace", "classic minimal"',
  "Outdoors":     '"multi-day treks", "wild camping minimal kit", "rock climber"',
  "Coffee":       '"specialty coffee, has a La Marzocco at home", "obsessed with matcha"',
  "Wellness":     '"hot yoga every morning", "into Ayurveda and breathwork"',
  "Home":         '"just moved in, furnishing from scratch", "Scandinavian design obsessed", "plant person"',
  "Photography":  '"shoots on film", "street photography black and white", "Sony A7 mirrorless"',
};
const VIBES = ["Cozy","Adventurous","Luxe","Minimalist","Playful","Sentimental","Practical","Trendy"];
const PROMPT_CHIPS = ["They already have…","Loves a particular brand","Inside joke gift"];

/* Step labels — translated per-render from i18n */
const STEP_NAMES_EN = ["Who are we gifting?","The occasion","The recipient","Their interests","Vibe & budget","A few details"];

/* ─── Types ─────────────────────────────────────────────── */
type OccasionOpt = typeof OCCASION_DATA[0];
interface Gathered {
  occasion:       OccasionOpt | null;
  recipientName:  string;
  relationship:   string;
  age:            number;
  interests:      string[];
  customInterest: string;
  vibe:           string[];
  budget:         number;
  details:        string;
  socialUrl:      string;
}
const EMPTY: Gathered = {
  occasion:null, recipientName:"", relationship:"", age:30,
  interests:[], customInterest:"", vibe:[], budget:75, details:"", socialUrl:"",
};

/* ─── Helpers ───────────────────────────────────────────── */
function fmtAge(a:number) { return a<=2?`${a} yr`:a>=90?"90+":`${a}`; }
function fmtBudget(b:number, sym:string) { return b>=500?`${sym}500+`:`${sym}${b}`; }
function parsePriceLow(r:string):number { const m=r.replace(/[, ]/g,"").match(/\d+/); return m?parseInt(m[0]):9999; }

function buildFirstMessage(g:Gathered, sym:string):string {
  const budgetMax = g.budget>=500?2000:g.budget;
  const budgetMin = Math.max(10,Math.round(g.budget*0.65));
  const nameStr   = g.recipientName ? `${g.recipientName}, ` : "";
  const autoHints = g.interests.slice(0,3)
    .map(i=>{ const ex=INTEREST_EXAMPLES[i]; return ex?`• ${i}: ${ex}`:null; })
    .filter(Boolean).join("\n");
  return [
    `I need a ${g.occasion?.id??"gift"} gift for my ${g.relationship.toLowerCase()}${g.recipientName?` (${g.recipientName})`:""}.`,
    `Age: ${fmtAge(g.age)} years old.`,
    g.interests.length?`Interests: ${g.interests.join(", ")}.`:"",
    autoHints?`Interest context:\n${autoHints}`:"",
    g.vibe.length?`Their personality vibe: ${g.vibe.join(", ")}.`:"",
    g.details?`Extra details: ${g.details}`:"",
    g.customInterest ? `Additional interest (typed by user): ${g.customInterest}.` : "",
    `Budget: ${sym}${budgetMin}–${sym}${budgetMax}. Stay within range and use it fully.`,
    g.recipientName?`The recipient's name is ${g.recipientName} — use the name to infer their likely gender and tailor suggestions accordingly.`:"",
    g.socialUrl?`⚡ SOCIAL PROFILE PROVIDED: Their social media / wishlist is in your system context. Mine it deeply — every suggestion must cite a specific signal found there.`:"",
    "Propose 4–6 specific, real, named products (brand + model + variant). Each must feel tailored to this exact person.",
  ].filter(Boolean).join("\n");
}

/* ─── Style helpers ─────────────────────────────────────── */
function chipSt(active:boolean):React.CSSProperties {
  return active
    ?{padding:"11px 17px",borderRadius:999,border:`1.5px solid ${C.maroon}`,background:C.maroon,color:"#fff",font:`600 14.5px ${BODY}`,cursor:"pointer",boxShadow:"0 4px 12px rgba(124,63,63,.22)",transition:"all .15s"}
    :{padding:"11px 17px",borderRadius:999,border:`1.5px solid ${C.border3}`,background:"#fff",color:"#5a4a40",font:`600 14.5px ${BODY}`,cursor:"pointer",transition:"all .15s"};
}
function tileSt(active:boolean):React.CSSProperties {
  return active
    ?{display:"flex",flexDirection:"column",alignItems:"center",gap:7,padding:"18px 10px",borderRadius:15,border:`1.5px solid ${C.maroon}`,background:"#fdf6ef",color:C.maroon,font:`600 13.5px ${BODY}`,cursor:"pointer",transition:"all .15s",boxShadow:"0 6px 16px rgba(124,63,63,.14)"}
    :{display:"flex",flexDirection:"column",alignItems:"center",gap:7,padding:"18px 10px",borderRadius:15,border:`1.5px solid ${C.border2}`,background:"#fff",color:"#5a4a40",font:`600 13.5px ${BODY}`,cursor:"pointer",transition:"all .15s"};
}
const btnPrimary:React.CSSProperties={padding:"13px 26px",borderRadius:12,border:"none",background:C.maroon,color:"#fff",font:`600 15.5px ${BODY}`,cursor:"pointer",boxShadow:"0 6px 18px rgba(124,63,63,.28)",transition:"all .15s"};
const btnDisabled:React.CSSProperties={padding:"13px 26px",borderRadius:12,border:"none",background:C.border3,color:C.muted2,font:`600 15.5px ${BODY}`,cursor:"not-allowed",transition:"all .15s"};

function GiftSVG({size=20,fill="#5e2e2e"}:{size?:number;fill?:string}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M20 7h-3.2a2.6 2.6 0 1 0-4.8 0 2.6 2.6 0 1 0-4.8 0H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm-6.6-1.4a1 1 0 1 1 1 1h-1v-1Zm-3.8-1a1 1 0 0 1 1 1v1h-1a1 1 0 0 1 0-2Z" fill={fill}/>
    </svg>
  );
}

/* ─── InterestsStep (separate to use its own local state) ── */
function InterestsStep({ g, setG, lang, strings, C: colors, BODY: bodyFont, chipSt: chip }: {
  g: Gathered;
  setG: React.Dispatch<React.SetStateAction<Gathered>>;
  lang: LangCode;
  strings: ReturnType<typeof t>;
  C: typeof C;
  BODY: string;
  chipSt: (active: boolean) => React.CSSProperties;
}) {
  const [showOtherInput, setShowOtherInput] = useState(false);
  const otherLabel: Record<LangCode, string> = {
    en:"Other…", it:"Altro…", fr:"Autre…", de:"Anderes…", es:"Otro…", pt:"Outro…",
  };
  const otherPlaceholder: Record<LangCode, string> = {
    en:"e.g. Formula 1, yoga, wine, vintage cars…",
    it:"es. Formula 1, yoga, vino, auto d'epoca…",
    fr:"ex. Formule 1, yoga, vin, voitures vintage…",
    de:"z.B. Formel 1, Yoga, Wein, Oldtimer…",
    es:"ej. Fórmula 1, yoga, vino, coches clásicos…",
    pt:"ex. Fórmula 1, yoga, vinho, carros vintage…",
  };

  function toggleInterest(i: string) {
    setG(prev => ({
      ...prev,
      interests: prev.interests.includes(i)
        ? prev.interests.filter(x => x !== i)
        : [...prev.interests, i],
    }));
  }

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:9 }}>
        {INTERESTS.map(i => (
          <button key={i} onClick={() => toggleInterest(i)} style={chip(g.interests.includes(i))}>{i}</button>
        ))}
        {/* "Other" toggle chip */}
        <button
          onClick={() => { setShowOtherInput(v => !v); if (showOtherInput) setG(p => ({ ...p, customInterest:"" })); }}
          style={chip(showOtherInput || g.customInterest.trim().length > 0)}>
          {otherLabel[lang] ?? otherLabel.en}
        </button>
      </div>

      {/* Custom interest text field */}
      {showOtherInput && (
        <div style={{ marginTop:14 }}>
          <input
            autoFocus
            type="text"
            value={g.customInterest}
            onChange={e => setG(p => ({ ...p, customInterest: e.target.value }))}
            placeholder={otherPlaceholder[lang] ?? otherPlaceholder.en}
            style={{ width:"100%", padding:"12px 15px", border:`1.5px solid ${colors.maroon}`, borderRadius:12, fontFamily:bodyFont, fontSize:15, color:colors.body, background:"#fff", boxSizing:"border-box" as const, outline:"none" }}
          />
        </div>
      )}

      <div style={{ marginTop:14, fontSize:13, color:colors.muted2 }}>
        {(g.interests.length > 0 || g.customInterest.trim())
          ? strings.confirm_n_selected(g.interests.length + (g.customInterest.trim() ? 1 : 0))
          : strings.pick_at_least_one}
      </div>
    </div>
  );
}

/* ═══════════════════════════ COMPONENT ═══════════════════ */
export default function Home() {
  const [screen,      setScreen]      = useState<"intake"|"loading"|"results">("intake");
  const [step,        setStep]        = useState(0);
  const [stepKey,     setStepKey]     = useState(0);
  const [g,           setG]           = useState<Gathered>(EMPTY);
  const [gifts,       setGifts]       = useState<GiftSuggestion[]>([]);
  const [sortBy,      setSortBy]      = useState<"match"|"price"|"priceHigh">("match");
  const [loadingLine, setLoadingLine] = useState(0);
  /* Language & locale */
  const [lang,   setLang]   = useState<LangCode>("en");
  const [locale, setLocale] = useState<UserLocale>(DEFAULT_LOCALE);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  /* ── Detect browser language & IP locale ── */
  useEffect(()=>{
    setLang(detectLangFromBrowser());
    fetch("https://ipapi.co/json/",{signal:AbortSignal.timeout(5000)})
      .then(r=>r.json())
      .then(raw=>{
        const loc = buildLocale(raw);
        setLocale(loc);
      })
      .catch(()=>{});
  },[]);

  const strings = t(lang);
  const sym     = locale.currencySymbol;

  /* Loading status lines using translated strings */
  const LOADING_LINES = [
    strings.loading_social_profile,
    strings.loading_social_posts,
    strings.loading_matching(g.recipientName||"them"),
    strings.loading_finalising,
  ];

  /* Translated concierge messages — one per step (6 total) */
  const name = g.recipientName||"them";
  const CONCIERGE_MSGS = [
    strings.q_name,                      // step 0: ask name
    strings.q_occasion(name),            // step 1: occasion
    strings.q_relation(name),            // step 2: relation + age
    strings.q_interests(name),           // step 3: interests
    `${strings.q_budget}`,              // step 4: vibe + budget
    strings.q_social(name),             // step 5: details + social
  ];

  useEffect(()=>{
    if(screen==="loading"){
      intervalRef.current=setInterval(()=>setLoadingLine(l=>(l+1)%LOADING_LINES.length),650);
    } else { if(intervalRef.current) clearInterval(intervalRef.current); }
    return()=>{ if(intervalRef.current) clearInterval(intervalRef.current); };
  },[screen]);// eslint-disable-line react-hooks/exhaustive-deps

  /* ── Navigation ── */
  function canContinue(){
    if(step===0) return g.recipientName.trim().length>0;
    if(step===1) return !!g.occasion;
    if(step===2) return !!g.relationship;
    if(step===3) return g.interests.length>0 || g.customInterest.trim().length>0;
    if(step===4) return g.vibe.length>0;
    return true;
  }
  function advance(){ if(step<5){setStep(s=>s+1);setStepKey(k=>k+1);}else fireRequest(); }
  function goBack(){ setStep(s=>Math.max(0,s-1));setStepKey(k=>k+1); }
  function restart(){ setG(EMPTY);setStep(0);setStepKey(0);setGifts([]);setSortBy("match");setScreen("intake"); }
  function toggle(field:"interests"|"vibe",val:string){
    setG(prev=>({...prev,[field]:(prev[field] as string[]).includes(val)?(prev[field] as string[]).filter(x=>x!==val):[...(prev[field] as string[]),val]}));
  }

  /* ── API call ── */
  async function fireRequest(){
    setScreen("loading");setLoadingLine(0);
    const budgetMax=g.budget>=500?2000:g.budget;
    const budgetMin=Math.max(10,Math.round(g.budget*0.65));
    const recipient={
      name: g.recipientName||"",
      age: fmtAge(g.age),
      relation: g.relationship,
      occasion: g.occasion?.id??"Gift",
      interests: g.interests.join(", "),
      budgetMin, budgetMax,
      notes:[g.vibe.length?`Vibe: ${g.vibe.join(", ")}.`:"",g.details].filter(Boolean).join(" "),
      socialUrls: g.socialUrl?[g.socialUrl]:[],
    };
    try{
      const res=await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({recipient,messages:[{role:"user",content:buildFirstMessage(g,sym)}],reactions:{},locale}),
      });
      const data:ChatResponse=await res.json();
      setGifts(data.suggestions??[]);
    }catch{ setGifts([]); }
    setScreen("results");
  }

  /* ── Sorted gifts ── */
  const sorted=[...gifts].sort((a,b)=>{
    if(sortBy==="price")     return parsePriceLow(a.priceRange)-parsePriceLow(b.priceRange);
    if(sortBy==="priceHigh") return parsePriceLow(b.priceRange)-parsePriceLow(a.priceRange);
    return(b.matchScore??0)-(a.matchScore??0);
  });

  /* ── Language menu overlay close on outside click ── */
  const langMenuRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    function h(e:MouseEvent){ if(langMenuRef.current&&!langMenuRef.current.contains(e.target as Node)) setShowLangMenu(false); }
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[]);

  /* ══════════════════════════ RENDER ══════════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
        @keyframes gcfade  { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
        @keyframes gcorbit { to{transform:rotate(360deg)} }
        @keyframes gcpulse { 0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1)} }
        @keyframes gcbob   { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
        .gc-fade {animation:gcfade .4s ease both}
        .gc-orbit{animation:gcorbit 2.4s linear infinite}
        .gc-bob  {animation:gcbob 2s ease-in-out infinite}
        .gc-p1{animation:gcpulse 1.2s ease-in-out infinite}
        .gc-p2{animation:gcpulse 1.2s ease-in-out .2s infinite}
        .gc-p3{animation:gcpulse 1.2s ease-in-out .4s infinite}
        input[type=range].gc-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;outline:none;cursor:pointer}
        input[type=range].gc-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#7c3f3f;border:3px solid #fff;box-shadow:0 2px 8px rgba(124,63,63,.4);cursor:pointer}
        textarea.gc-ta:focus,input.gc-in:focus{outline:none;border-color:#7c3f3f!important}
        @media(max-width:900px){.gc-brand{display:none!important}.gc-main{padding:24px 20px 40px!important}.gc-grid3{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.ink,fontFamily:BODY}}>

        {/* ══ BRAND PANEL ═══════════════════════════════════ */}
        <aside className="gc-brand" style={{width:"38%",maxWidth:520,background:C.brand,color:"#f3e7d8",padding:"48px 44px",display:"flex",flexDirection:"column",justifyContent:"space-between",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",width:320,height:320,borderRadius:"50%",background:"radial-gradient(circle,#c9a26b55,transparent 70%)",top:-80,right:-90}}/>
          <div style={{position:"absolute",width:240,height:240,borderRadius:"50%",background:"radial-gradient(circle,#e8d5c433,transparent 70%)",bottom:40,left:-100}}/>

          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:11,position:"relative"}}>
            <div style={{width:38,height:38,borderRadius:11,background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px rgba(0,0,0,.25)"}}>
              <GiftSVG size={20} fill="#5e2e2e"/>
            </div>
            <span style={{fontFamily:DISPLAY,fontWeight:600,fontSize:19,letterSpacing:"-.01em"}}>Gift Concierge</span>
          </div>

          {/* Headline */}
          <div style={{position:"relative"}}>
            <h1 style={{fontFamily:DISPLAY,fontWeight:600,fontSize:38,lineHeight:1.08,letterSpacing:"-.02em",margin:"0 0 18px",color:"#f3e7d8"}}>
              The perfect gift,<br/>found for you.
            </h1>
            <p style={{fontSize:16,lineHeight:1.55,color:"#e8d5c4",maxWidth:340,margin:"0 0 30px"}}>
              Answer a few quick questions and Margot — your personal concierge — curates gifts they&apos;ll genuinely love.
            </p>
            <div style={{display:"flex",flexDirection:"column",gap:13}}>
              {["Hand-picked, not algorithm spam","Every budget, every occasion","Free · No account · ~2 minutes"].map(txt=>(
                <div key={txt} style={{display:"flex",alignItems:"center",gap:11,fontSize:14.5,color:"#f0e3d2"}}>
                  <span style={{width:22,height:22,borderRadius:"50%",background:"#c9a26b33",display:"flex",alignItems:"center",justifyContent:"center",color:"#e8c98f",flexShrink:0}}>✓</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>

          {/* Social proof + locale badge */}
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,fontSize:13.5,color:"#d8c4b0",marginBottom:14}}>
              <div style={{display:"flex"}}>
                {(["#c9a26b","#e8d5c4","#a8694a"] as const).map((bg,i)=>(
                  <span key={i} style={{width:30,height:30,borderRadius:"50%",background:bg,border:"2px solid #5e2e2e",marginLeft:i?-10:0}}/>
                ))}
              </div>
              <span>Loved by <strong style={{color:"#fff"}}>42,000+</strong> thoughtful gifters</span>
            </div>
            {/* Locale info chip */}
            <div style={{fontSize:12.5,color:"#b8a898",background:"rgba(0,0,0,.15)",borderRadius:8,padding:"6px 11px",display:"inline-block"}}>
              {LANG_FLAGS[lang]??""} {lang.toUpperCase()} · {locale.currency} ({sym}) · {locale.countryCode}
            </div>
          </div>
        </aside>

        {/* ══ MAIN COLUMN ════════════════════════════════════ */}
        <main className="gc-main" style={{flex:1,padding:"40px 56px 56px",display:"flex",flexDirection:"column",minWidth:0,position:"relative"}}>

          {/* Language switcher */}
          <div ref={langMenuRef} style={{position:"absolute",top:20,right:24,zIndex:20}}>
            <button onClick={()=>setShowLangMenu(v=>!v)} style={{padding:"8px 14px",borderRadius:999,border:`1.5px solid ${C.border3}`,background:"#fff",color:C.label,font:`600 13px ${BODY}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              {LANG_FLAGS[lang]??""} {lang.toUpperCase()} <span style={{opacity:.5,fontSize:10}}>▾</span>
            </button>
            {showLangMenu&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"#fff",border:`1.5px solid ${C.border}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.1)",overflow:"hidden",minWidth:140}}>
                {(["en","it","fr","de","es","pt"] as LangCode[]).map(l=>(
                  <button key={l} onClick={()=>{setLang(l);setShowLangMenu(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 16px",border:"none",background:l===lang?"#fdf6ef":"#fff",color:C.body,font:`${l===lang?600:400} 14px ${BODY}`,cursor:"pointer",textAlign:"left"}}>
                    {LANG_FLAGS[l]??""} {l==="en"?"English":l==="it"?"Italiano":l==="fr"?"Français":l==="de"?"Deutsch":l==="es"?"Español":"Português"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── INTAKE ─────────────────────────────────────── */}
          {screen==="intake"&&(
            <div style={{maxWidth:640,width:"100%",margin:"0 auto",flex:1,display:"flex",flexDirection:"column"}}>

              {/* Progress bar */}
              <div style={{marginBottom:30}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:9}}>
                  <span style={{fontSize:13,fontWeight:600,letterSpacing:".04em",textTransform:"uppercase",color:C.muted3}}>Step {step+1} of 6</span>
                  <span style={{fontSize:13,color:C.muted2}}>{STEP_NAMES_EN[step]}</span>
                </div>
                <div style={{height:6,background:C.border3,borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg,#c9a26b,#7c3f3f)",borderRadius:999,width:`${((step+1)/6)*100}%`,transition:"width .45s cubic-bezier(.4,0,.2,1)"}}/>
                </div>
              </div>

              {/* Concierge bubble */}
              <div key={`bubble-${stepKey}`} className="gc-fade" style={{display:"flex",gap:14,marginBottom:26,alignItems:"flex-start"}}>
                <div style={{flexShrink:0,width:46,height:46,borderRadius:"50%",background:"linear-gradient(140deg,#7c3f3f,#a8694a)",display:"flex",alignItems:"center",justifyContent:"center",color:"#f3e7d8",fontFamily:DISPLAY,fontWeight:600,fontSize:19,boxShadow:"0 4px 12px rgba(124,63,63,.25)"}}>M</div>
                <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:"4px 18px 18px 18px",padding:"15px 19px",boxShadow:"0 2px 10px rgba(124,63,63,.05)"}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.gold,letterSpacing:".03em",marginBottom:3}}>MARGOT · YOUR CONCIERGE</div>
                  <div style={{fontSize:17,lineHeight:1.45,color:C.body,fontWeight:500}}>{CONCIERGE_MSGS[step]}</div>
                </div>
              </div>

              {/* Step content */}
              <div key={`content-${stepKey}`} className="gc-fade" style={{flex:1}}>

                {/* Step 0 — Recipient name */}
                {step===0&&(
                  <div>
                    <input
                      className="gc-in"
                      type="text"
                      autoFocus
                      value={g.recipientName}
                      onChange={e=>setG(p=>({...p,recipientName:e.target.value}))}
                      onKeyDown={e=>{ if(e.key==="Enter"&&canContinue()) advance(); }}
                      placeholder={strings.landing_name_placeholder}
                      style={{width:"100%",padding:"16px 18px",border:`1.5px solid ${C.border3}`,borderRadius:14,fontFamily:DISPLAY,fontSize:22,fontWeight:600,color:C.ink,background:"#fff",boxSizing:"border-box",letterSpacing:"-.01em"}}
                    />
                    <p style={{marginTop:12,fontSize:13,color:C.muted2,lineHeight:1.5}}>
                      The name helps Margot figure out their likely gender and personalise suggestions accordingly.
                    </p>
                  </div>
                )}

                {/* Step 1 — Occasion */}
                {step===1&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:11}}>
                    {OCCASION_DATA.map(o=>(
                      <button key={o.id} onClick={()=>setG(p=>({...p,occasion:o}))} style={tileSt(g.occasion?.id===o.id)}>
                        <span style={{fontSize:24}}>{o.emoji}</span>
                        <span>{tOccasion(lang,o.id)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2 — Relationship + Age */}
                {step===2&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:C.label,marginBottom:11}}>{strings.q_relation(name).split("?")[0].trim()}?</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:28}}>
                      {RELATIONS.map((r,i)=>(
                        <button key={r} onClick={()=>setG(p=>({...p,relationship:r}))} style={chipSt(g.relationship===r)}>
                          {(RELATION_LABELS[lang]??RELATION_LABELS.en)[i]}
                        </button>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
                      <span style={{fontSize:14,fontWeight:600,color:C.label}}>{strings.q_age(name)}</span>
                      <span style={{fontFamily:DISPLAY,fontWeight:600,fontSize:22,color:C.maroon}}>{fmtAge(g.age)} {strings.years_old}</span>
                    </div>
                    <input type="range" min={1} max={90} step={1} value={g.age}
                      onChange={e=>setG(p=>({...p,age:+e.target.value}))}
                      className="gc-range"
                      style={{width:"100%",background:`linear-gradient(90deg,${C.maroon} ${((g.age-1)/89)*100}%,#e3d4c2 ${((g.age-1)/89)*100}%)`}}
                    />
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted2,marginTop:7}}>
                      <span>Baby</span><span>Teen</span><span>Adult</span><span>Senior</span>
                    </div>
                  </div>
                )}

                {/* Step 3 — Interests */}
                {step===3&&(
                  <InterestsStep g={g} setG={setG} lang={lang} strings={strings} C={C} BODY={BODY} chipSt={chipSt as (active:boolean)=>React.CSSProperties} />
                )}

                {/* Step 4 — Vibe & Budget */}
                {step===4&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:C.label,marginBottom:11}}>Their vibe</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:9,marginBottom:32}}>
                      {VIBES.map(v=>(
                        <button key={v} onClick={()=>toggle("vibe",v)} style={chipSt(g.vibe.includes(v))}>{v}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
                      <span style={{fontSize:14,fontWeight:600,color:C.label}}>Budget</span>
                      <span style={{fontFamily:DISPLAY,fontWeight:600,fontSize:22,color:C.maroon}}>{fmtBudget(g.budget,sym)}</span>
                    </div>
                    <input type="range" min={10} max={500} step={5} value={g.budget}
                      onChange={e=>setG(p=>({...p,budget:+e.target.value}))}
                      className="gc-range"
                      style={{width:"100%",background:`linear-gradient(90deg,${C.maroon} ${((g.budget-10)/490)*100}%,#e3d4c2 ${((g.budget-10)/490)*100}%)`}}
                    />
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.muted2,marginTop:7}}>
                      <span>{sym}10</span><span>{sym}100</span><span>{sym}250</span><span>{sym}500+</span>
                    </div>
                  </div>
                )}

                {/* Step 5 — Details & Social URL */}
                {step===5&&(
                  <div>
                    <textarea
                      className="gc-ta"
                      value={g.details}
                      onChange={e=>setG(p=>({...p,details:e.target.value}))}
                      placeholder={strings.wishlist_placeholder}
                      style={{width:"100%",minHeight:130,resize:"vertical",padding:"16px 18px",border:`1.5px solid ${C.border3}`,borderRadius:14,background:"#fff",fontFamily:BODY,fontSize:16,lineHeight:1.5,color:C.body,boxSizing:"border-box"}}
                    />
                    <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:8}}>
                      {PROMPT_CHIPS.map(pc=>(
                        <button key={pc}
                          onClick={()=>setG(prev=>({...prev,details:prev.details?prev.details+" "+pc+" ":pc+" "}))}
                          style={{padding:"7px 13px",borderRadius:999,border:`1px dashed #d6c3ad`,background:"#fbf6ef",color:C.muted,font:`500 13px ${BODY}`,cursor:"pointer"}}>
                          + {pc}
                        </button>
                      ))}
                    </div>
                    <div style={{marginTop:20,paddingTop:20,borderTop:`1px solid ${C.border}`}}>
                      <div style={{fontSize:13.5,fontWeight:600,color:C.label,marginBottom:6}}>
                        {strings.q_social(name).split("\n")[0]}{" "}
                        <span style={{fontWeight:400,color:C.muted2}}>(optional)</span>
                      </div>
                      <input
                        type="url"
                        className="gc-in"
                        value={g.socialUrl}
                        onChange={e=>setG(p=>({...p,socialUrl:e.target.value}))}
                        placeholder={strings.url_hint}
                        style={{width:"100%",padding:"11px 15px",border:`1.5px solid ${C.border3}`,borderRadius:12,fontFamily:BODY,fontSize:14,color:C.body,background:"#fff",boxSizing:"border-box"}}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Nav */}
              <div style={{display:"flex",alignItems:"center",gap:14,marginTop:34,paddingTop:22,borderTop:`1px solid ${C.border4}`}}>
                {step>0&&(
                  <button onClick={goBack} style={{padding:"13px 20px",borderRadius:12,border:`1.5px solid #e0d0bd`,background:"transparent",color:"#7a6857",font:`600 15px ${BODY}`,cursor:"pointer"}}>
                    ← {strings.back_home.replace("←","").trim()||"Back"}
                  </button>
                )}
                <div style={{flex:1}}/>
                <button onClick={advance} disabled={!canContinue()} style={canContinue()?btnPrimary:btnDisabled}>
                  {step===5?strings.landing_cta.replace("→","✨").replace("perfect gift","my gifts"):strings.continue_btn}
                </button>
              </div>
            </div>
          )}

          {/* ── LOADING ─────────────────────────────────────── */}
          {screen==="loading"&&(
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
              <div style={{position:"relative",width:120,height:120,marginBottom:34}}>
                <div className="gc-orbit" style={{position:"absolute",top:0,left:0,right:0,bottom:0}}>
                  <span style={{position:"absolute",top:0,left:"50%",marginLeft:-7,width:14,height:14,borderRadius:"50%",background:C.maroon}}/>
                  <span style={{position:"absolute",bottom:0,left:"50%",marginLeft:-5,width:10,height:10,borderRadius:"50%",background:C.gold}}/>
                  <span style={{position:"absolute",left:0,top:"50%",marginTop:-4,width:8,height:8,borderRadius:"50%",background:C.terra}}/>
                </div>
                <div className="gc-bob" style={{position:"absolute",top:30,left:30,right:30,bottom:30,borderRadius:"50%",background:"linear-gradient(140deg,#7c3f3f,#a8694a)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(124,63,63,.3)"}}>
                  <GiftSVG size={28} fill="#f3e7d8"/>
                </div>
              </div>
              <h2 style={{fontFamily:DISPLAY,fontWeight:600,fontSize:27,color:C.body,margin:"0 0 10px",letterSpacing:"-.01em"}}>Margot is curating…</h2>
              <p style={{fontSize:16,color:C.muted,margin:"0 0 24px"}}>{LOADING_LINES[loadingLine]}</p>
              <div style={{display:"flex",gap:7}}>
                <span className="gc-p1" style={{width:9,height:9,borderRadius:"50%",background:C.maroon,display:"block"}}/>
                <span className="gc-p2" style={{width:9,height:9,borderRadius:"50%",background:C.maroon,display:"block"}}/>
                <span className="gc-p3" style={{width:9,height:9,borderRadius:"50%",background:C.maroon,display:"block"}}/>
              </div>
            </div>
          )}

          {/* ── RESULTS ─────────────────────────────────────── */}
          {screen==="results"&&(
            <div className="gc-fade" style={{maxWidth:980,width:"100%",margin:"0 auto"}}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:8}}>
                <div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:8,background:C.goldSurface,color:C.maroon,padding:"6px 13px",borderRadius:999,fontSize:12.5,fontWeight:600,letterSpacing:".03em",marginBottom:14}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:C.maroon}}/> CURATED FOR YOU
                  </div>
                  <h2 style={{fontFamily:DISPLAY,fontWeight:600,fontSize:30,lineHeight:1.12,color:C.ink,margin:"0 0 8px",letterSpacing:"-.02em"}}>
                    {sorted.length} gifts for {g.recipientName||(g.relationship?"your "+g.relationship.toLowerCase():"them")}&apos;s {(g.occasion?.id??"occasion").toLowerCase()}
                  </h2>
                  <p style={{fontSize:15.5,color:C.muted,margin:0,maxWidth:520}}>
                    Ranked by fit · {fmtBudget(g.budget,sym)} budget · {locale.countryName}
                  </p>
                </div>
                <button onClick={restart} style={{flexShrink:0,padding:"12px 18px",borderRadius:12,border:`1.5px solid #e0d0bd`,background:"#fff",color:"#7a6857",font:`600 14px ${BODY}`,cursor:"pointer"}}>
                  ↺ {strings.new_search}
                </button>
              </div>

              {/* Sort */}
              <div style={{display:"flex",alignItems:"center",gap:9,margin:"22px 0 20px"}}>
                <span style={{fontSize:13,color:C.muted2,fontWeight:600}}>Sort</span>
                {(["match","price","priceHigh"] as const).map((s,i)=>(
                  <button key={s} onClick={()=>setSortBy(s)}
                    style={sortBy===s
                      ?{padding:"8px 15px",borderRadius:999,border:`1.5px solid ${C.maroon}`,background:C.maroon,color:"#fff",font:`600 13px ${BODY}`,cursor:"pointer"}
                      :{padding:"8px 15px",borderRadius:999,border:`1.5px solid ${C.border3}`,background:"#fff",color:"#7a6857",font:`600 13px ${BODY}`,cursor:"pointer"}
                    }>
                    {["Best match","Price: low","Price: high"][i]}
                  </button>
                ))}
              </div>

              {/* Card grid */}
              <div className="gc-grid3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
                {sorted.map(gift=>{
                  const imgQ=gift.imageSearchQuery??gift.title;
                  const imgSrc=`/api/product-image?q=${encodeURIComponent(imgQ)}`;
                  const giftLink=gift.link??`https://www.google.com/search?q=${encodeURIComponent(gift.title)}`;
                  return(
                    <div key={gift.id} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:18,overflow:"hidden",boxShadow:"0 4px 18px rgba(124,63,63,.06)",display:"flex",flexDirection:"column"}}>
                      <div style={{height:148,background:"linear-gradient(140deg,#f0e3d2,#dcc09e)",position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgSrc} alt={gift.title} loading="lazy" style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                        {gift.category&&(
                          <span style={{position:"relative",zIndex:1,fontSize:11,fontWeight:700,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,63,63,0.65)",textShadow:"0 1px 3px rgba(255,255,255,.9)"}}>{gift.category}</span>
                        )}
                        {gift.matchScore!=null&&(
                          <span style={{position:"absolute",top:11,right:11,background:"#fff",color:C.maroon,fontSize:12,fontWeight:700,padding:"4px 9px",borderRadius:999,boxShadow:"0 2px 6px rgba(0,0,0,.08)",zIndex:2}}>{gift.matchScore}% match</span>
                        )}
                      </div>
                      <div style={{padding:"16px 17px 17px",display:"flex",flexDirection:"column",flex:1}}>
                        <div style={{fontFamily:DISPLAY,fontWeight:600,fontSize:17.5,lineHeight:1.22,color:C.ink,marginBottom:3}}>{gift.title}</div>
                        <div style={{fontSize:12.5,color:C.muted2,marginBottom:11}}>{gift.description.split(".")[0]}.</div>
                        <div style={{display:"flex",gap:9,background:"#fbf6ef",borderRadius:11,padding:"10px 12px",marginBottom:14}}>
                          <span style={{flexShrink:0,color:C.gold,fontSize:15,lineHeight:1}}>❝</span>
                          <span style={{fontSize:13,lineHeight:1.45,color:C.label}}>{gift.reason}</span>
                        </div>
                        <div style={{marginTop:"auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{fontFamily:DISPLAY,fontWeight:700,fontSize:20,color:C.ink}}>{gift.priceRange}</span>
                          <a href={giftLink} target="_blank" rel="noopener noreferrer"
                            style={{padding:"9px 16px",borderRadius:10,border:"none",background:C.maroon,color:"#fff",font:`600 14px ${BODY}`,cursor:"pointer",textDecoration:"none",display:"inline-block"}}>
                            {strings.search_google} →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{textAlign:"center",marginTop:34}}>
                <button onClick={restart} style={{padding:"14px 26px",borderRadius:12,border:`1.5px solid #e0d0bd`,background:"#fff",color:C.maroon,font:`600 15px ${BODY}`,cursor:"pointer"}}>
                  {strings.refine_btn}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
