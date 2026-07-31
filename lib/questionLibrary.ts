import type { AdaptiveQuestionOption } from "./types";

/** A single candidate question the AI can pick from when it decides which
 * uncertainty is most worth resolving (mobile adaptive intake, step 3→4).
 * `{interest}` is replaced with the recipient's stated interest at request
 * time. Kept interest-agnostic (generic templates) rather than one entry per
 * interest, to keep the library small and easy to extend. */
export interface QuestionLibraryEntry {
  id: string;
  /** What kind of uncertainty this question resolves — helps the model pick. */
  resolves: string;
  question: string;
  options: AdaptiveQuestionOption[];
}

export const QUESTION_LIBRARY: QuestionLibraryEntry[] = [
  {
    id: "importance",
    resolves: "quanto è centrale questa passione/interesse nella vita del destinatario",
    question: "Quanto è importante {interest} per lui/lei?",
    options: [
      { id: "occasional", label: "È un interesse occasionale" },
      { id: "regular", label: "La pratica regolarmente" },
      { id: "core", label: "È una vera passione, quasi identitaria" },
    ],
  },
  {
    id: "already_has",
    resolves: "cosa possiede già, per evitare regali doppioni",
    question: "Cosa usa già per {interest}?",
    options: [
      { id: "beginner_gear", label: "L'attrezzatura di base, sta iniziando" },
      { id: "good_gear", label: "Ha già del buon materiale" },
      { id: "top_gear", label: "Ha già l'attrezzatura migliore sul mercato" },
      { id: "dont_know", label: "Non lo so" },
    ],
  },
  {
    id: "gift_style",
    resolves: "che tipo di regalo apprezza di più in generale",
    question: "Cosa gli/le piace di più ricevere in regalo?",
    options: [
      { id: "useful", label: "Qualcosa di utile e pratico" },
      { id: "experience", label: "Un'esperienza da vivere" },
      { id: "personal", label: "Qualcosa di personale e ricercato" },
      { id: "curious", label: "Qualcosa di curioso o inaspettato" },
    ],
  },
  {
    id: "memory",
    resolves: "un ricordo o momento condiviso da cui trarre un'idea più emotiva",
    question: "C'è un ricordo o un momento che vi rappresenta?",
    options: [
      { id: "trip", label: "Un viaggio fatto insieme" },
      { id: "milestone", label: "Un traguardo importante raggiunto di recente" },
      { id: "habit", label: "Un rito/abitudine che condividete" },
      { id: "none", label: "Niente in particolare" },
    ],
  },
  {
    id: "behavior",
    resolves: "il tratto di personalità che meglio orienta lo stile del regalo",
    question: "Quale comportamento lo/la descrive meglio?",
    options: [
      { id: "meticulous", label: "Metodico/a e attento/a ai dettagli" },
      { id: "spontaneous", label: "Spontaneo/a e curioso/a" },
      { id: "sentimental", label: "Sentimentale, dà valore ai ricordi" },
      { id: "minimalist", label: "Essenziale, non ama gli oggetti superflui" },
    ],
  },
];

/** Ask the model to resolve at most this many rounds of adaptive questions
 * before moving on — matches the "ripete al massimo una seconda volta" rule. */
export const MAX_ADAPTIVE_ROUNDS = 2;
