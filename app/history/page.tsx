"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listSessions, deleteSession } from "@/lib/sessionStorage";
import type { Session, GiftSuggestion } from "@/lib/types";

const OCCASION_EMOJI: Record<string, string> = {
  "Birthday":        "🎂",
  "Christmas":       "🎄",
  "Valentine's Day": "💝",
  "Mother's Day":    "🌸",
  "Father's Day":    "👔",
  "Graduation":      "🎓",
  "Wedding":         "💍",
  "Anniversary":     "💑",
  "Housewarming":    "🏡",
  "Baby Shower":     "👶",
  "Just Because":    "✨",
  "Other":           "🎁",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ItemCard({ s }: { s: GiftSuggestion }) {
  const imgSrc = `/api/product-image?q=${encodeURIComponent(s.title)}`;
  return (
    <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative w-full h-36 bg-slate-100 overflow-hidden flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} alt={s.title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/90 text-white backdrop-blur-sm">
          ❤️
        </span>
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
          {s.priceRange}
        </span>
      </div>
      <div className="p-3">
        <h4 className="font-display text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{s.title}</h4>
        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{s.description}</p>
        <div className="flex gap-2 mt-2.5">
          <a
            href={`https://www.amazon.com/s?k=${encodeURIComponent(s.title)}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-[#FF9900] transition-colors">
            📦 Amazon
          </a>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(s.title + " buy")}`}
            target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-slate-400 hover:text-amber-500 transition-colors">
            🔍 Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function remove(id: string) {
    deleteSession(id);
    setSessions(listSessions());
  }

  // All loved items across ALL sessions, deduplicated by id
  const allLoved = (() => {
    const seen = new Set<string>();
    const out: { item: GiftSuggestion; session: Session }[] = [];
    for (const s of sessions) {
      for (const item of s.lovedHistory ?? []) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push({ item, session: s });
        }
      }
    }
    return out;
  })();

  return (
    <div className="min-h-screen bg-[#FDFAF7]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/chat"
            className="text-sm text-slate-400 hover:text-slate-700 transition-colors">
            ← Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11.5" width="16" height="9.5" rx="1.5"/>
                <rect x="3" y="8.5" width="18" height="3.5" rx="1"/>
                <line x1="12" y1="8.5" x2="12" y2="21"/>
                <path d="M12 8.5 C10.5 6 7 5.5 6.5 7.5 C6 9 9 9.5 12 8.5Z"/>
                <path d="M12 8.5 C13.5 6 17 5.5 17.5 7.5 C18 9 15 9.5 12 8.5Z"/>
              </svg>
            </div>
            <span className="font-display font-semibold text-slate-800">Gift Concierge</span>
          </div>
          <div className="w-14" /> {/* spacer */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {sessions.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-5xl mb-4 opacity-30">❤️</div>
            <h2 className="font-display text-2xl font-semibold text-slate-700 mb-2">No searches yet</h2>
            <p className="text-slate-400 text-sm mb-6">Start a new gift search and react to suggestions — they'll be saved here.</p>
            <Link href="/chat"
              className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-sm hover:from-orange-400 transition-all">
              Start a search →
            </Link>
          </div>
        ) : (
          <>
            {/* ── All loved items (across all searches) ── */}
            {allLoved.length > 0 && (
              <section className="mb-10">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-display text-2xl font-semibold text-slate-800">
                    ❤️ All saved picks
                  </h2>
                  <span className="text-xs text-slate-400">{allLoved.length} item{allLoved.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {allLoved.map(({ item }) => (
                    <ItemCard key={item.id} s={item} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Divider ── */}
            {allLoved.length > 0 && (
              <div className="border-t border-slate-100 mb-8" />
            )}

            {/* ── All sessions ── */}
            <section>
              <h2 className="font-display text-2xl font-semibold text-slate-800 mb-4">
                All searches
              </h2>
              <div className="space-y-4">
                {sessions.map((s) => {
                  const occasionEmoji = OCCASION_EMOJI[s.recipient.occasion] ?? "🎁";
                  const lovedInSession = s.lovedHistory ?? [];
                  const isExpanded = expanded.has(s.id);

                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Session header */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Occasion icon */}
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl flex-shrink-0">
                          {occasionEmoji}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800">
                              {s.recipient.name || "Unnamed recipient"}
                            </span>
                            {s.recipient.occasion && (
                              <span className="text-xs bg-orange-50 text-orange-500 font-medium px-2 py-0.5 rounded-full border border-orange-100">
                                {s.recipient.occasion}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                            <span>{formatDate(s.createdAt)}</span>
                            {s.recipient.budgetMin != null && (
                              <span>${s.recipient.budgetMin}–${s.recipient.budgetMax}</span>
                            )}
                            <span>{s.suggestions.length} suggestions</span>
                            {lovedInSession.length > 0 && (
                              <span className="text-rose-400 font-medium">❤️ {lovedInSession.length} loved</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {lovedInSession.length > 0 && (
                            <button
                              onClick={() => toggle(s.id)}
                              className="text-xs text-slate-400 hover:text-orange-500 transition-colors border border-slate-200 hover:border-orange-200 rounded-lg px-2.5 py-1.5">
                              {isExpanded ? "Hide" : "Loved ↓"}
                            </button>
                          )}
                          <Link
                            href={`/chat?restore=${s.id}`}
                            className="text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 px-3 py-1.5 rounded-lg transition-all shadow-sm">
                            Open →
                          </Link>
                          <button
                            onClick={() => remove(s.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                            title="Delete">
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                              <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1M6 6.5v4M8 6.5v4M3.5 3.5l.5 8a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Loved items expandable section */}
                      {isExpanded && lovedInSession.length > 0 && (
                        <div className="px-5 pb-5 border-t border-slate-50 pt-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {lovedInSession.map((item) => (
                              <ItemCard key={item.id} s={item} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
