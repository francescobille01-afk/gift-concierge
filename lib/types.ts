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
  /** Product category label shown on the card, e.g. "Skincare", "Tech", "Kitchen" */
  category?: string;
  /** How well this gift matches the recipient, 80–99 */
  matchScore?: number;
}

export type ReactionType = "love_it" | "already_owned" | "not_their_style" | null;

export interface RecipientProfile {
  name: string;
  age: string;
  relation: string;
  occasion: string;
  interests: string;
  budgetMin: number;
  budgetMax: number;
  notes: string;
  socialUrls: string[];
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
}

export interface ChatResponse {
  message: string;
  suggestions: GiftSuggestion[];
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
