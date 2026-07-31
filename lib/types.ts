export interface GiftEntry {
  id: string;
  title: string;
  description: string;
  occasionTags: string[];
  interestTags: string[];
  priceMin: number;
  priceMax: number;
  link?: string;
}

export interface GiftSuggestion {
  id: string;
  title: string;
  description: string;
  priceRange: string;
  reason: string;
  link?: string;
  /** Short keyword phrase for fetching a product photo, e.g. "tatcha skincare mist beauty" */
  imageSearchQuery?: string;
  /** Real product photo URL found via web search — the actual product, not a stock photo */
  imageUrl?: string;
  /** Real link to the brand's/retailer's official product page, found via web search */
  officialLink?: string;
  /** Real Amazon product link on the buyer's local Amazon store (e.g. amazon.it), found via web search */
  amazonLink?: string;
  /** Product category label shown on the card, e.g. "Skincare", "Tech", "Kitchen" */
  category?: string;
}

export type ReactionType = "love_it" | "already_owned" | "not_their_style" | null;

export interface RecipientProfile {
  name: string;
  age: string;
  relation: string;
  gender?: string;
  occasion: string;
  interests: string;
  budgetMin: number;
  budgetMax: number;
  notes: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UserLocale {
  countryCode: string;   // "IT", "GB", "US", etc.
  countryName: string;   // "Italy"
  currency: string;      // "EUR"
  currencySymbol: string;// "€"
  amazonDomain: string;  // "amazon.it"
  language: string;      // "it", "fr", "de", "es", "pt", "en"
}

export interface ChatRequest {
  recipient: RecipientProfile;
  messages: ChatMessage[];
  reactions: Record<string, ReactionType>;
  locale?: UserLocale;
  /** Current suggestions shown to user — used to exclude them from refinement results */
  currentSuggestions?: GiftSuggestion[];
}

export interface ChatResponse {
  message: string;
  suggestions: GiftSuggestion[];
}

/** Free-form signals extracted by the adaptive-question step from the
 * user's free-text observation (step 3 of the mobile adaptive intake). */
export interface ProfileSignal {
  key: string;
  value: string;
}

export interface AdaptiveQuestionOption {
  id: string;
  label: string;
}

/** Response shape from POST /api/adaptive-question */
export interface AdaptiveQuestionResult {
  signals: ProfileSignal[];
  incertezza_principale: string;
  domanda_scelta: string;
  opzioni: AdaptiveQuestionOption[];
}

export interface AdaptiveQuestionRequest {
  recipient: RecipientProfile;
  observation: string;
  locale?: UserLocale;
  /** Set on the second adaptive-question round, after the user answered the first. */
  previousQuestion?: string;
  previousAnswer?: string;
}

/** Gift-direction the user picked in step 5 of the mobile adaptive intake. */
export type GiftDirection = "usable" | "experience" | "personal" | "curious" | "unsure";

/** How a given suggestion in the 3-result mobile screen is framed to the user. */
export type ResultFraming = "centered" | "personalized" | "unexpected";

export interface FramedGiftSuggestion extends GiftSuggestion {
  framing: ResultFraming;
}

export interface Session {
  id: string;
  createdAt: string;
  recipient: RecipientProfile;
  messages: ChatMessage[];
  suggestions: GiftSuggestion[];
  reactions: Record<string, ReactionType>;
  chosen: string | null;
  /** All items the user reacted ❤️ to across all refinement rounds */
  lovedHistory: GiftSuggestion[];
}
