/**
 * UI translations for Gift Concierge.
 * Supported: en, it, fr, de, es, pt
 */

export type LangCode = "en" | "it" | "fr" | "de" | "es" | "pt";

/** Maps a browser navigator.language string to a supported LangCode */
export function detectLang(raw: string): LangCode {
  const primary = (raw ?? "en").split(",")[0].split("-")[0].toLowerCase();
  const supported: LangCode[] = ["en", "it", "fr", "de", "es", "pt"];
  return supported.includes(primary as LangCode) ? (primary as LangCode) : "en";
}

/**
 * Detects language from the browser — uses navigator.languages (full list)
 * first, which is more reliable on iOS Safari.
 */
export function detectLangFromBrowser(): LangCode {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language ?? "en"];
  for (const l of langs) {
    const result = detectLang(l);
    if (result !== "en") return result; // found a supported non-English language
  }
  // If the first language in the list IS English, honour it
  if (langs[0]) return detectLang(langs[0]);
  return "en";
}

export interface Strings {
  /* Landing page */
  landing_tagline:          string;
  landing_who_label:        string;
  landing_name_placeholder: string;
  landing_occasion_label:   string;
  landing_occasion_placeholder: string;
  landing_cta:              string;
  landing_footer:           string;
  /* Greeting when name+occasion are pre-filled from URL params */
  greeting: (name: string, occasion: string) => string;
  /* Onboarding step questions */
  q_name:           string;
  q_occasion:       (name: string) => string;
  q_relation:       (name: string) => string;
  q_age:            (name: string) => string;
  q_budget:         string;
  q_interests:      (name: string) => string;
  q_interestDetail: (topStr: string, examples: string) => string;
  q_style:          (name: string) => string;
  q_wishlist:       (name: string) => string;
  q_avoid:          (name: string) => string;
  /* Loading stages */
  loading_matching:         (name: string) => string;
  loading_finalising:       string;
  /* Chat UI */
  skip:                 string;
  send:                 string;
  type_placeholder:     string;
  type_age_placeholder: string;
  other_placeholder:    string;
  continue_btn:         string;
  /* Suggestions panel */
  gift_ideas:     string;
  why_this:       string;
  search_amazon:  string;
  search_google:  string;
  choose_this:    string;
  chosen:         string;
  copy_all:       string;
  copied:         string;
  no_suggestions: string;
  /* Reactions */
  react_love:      string;
  react_owned:     string;
  react_not_style: string;
  /* Misc */
  new_search: string;
  history:    string;
  back_home:  string;
  /* Language toggle labels */
  switch_to_local:   string;
  switch_to_english: string;
  /* Small inline UI labels */
  years_old:          string;
  next_btn:           string;
  pick_at_least_one:  string;
  none_apply:         string;
  great_noted:        string;
  add_hint_first:     string;
  chat_placeholder:   string;
  confirm_n_selected: (n: number) => string;
  hint_quality:          string;
  wishlist_placeholder:  string;
  history_title:       string;
  history_empty:       string;
  history_footer:      string;
  error_generic:       string;
  /* Budget range labels */
  budget_under: string;   // "Under"
  budget_above: string;   // "500 +"  suffix
  n_picks:      (n: number) => string;
  /* Refine flow */
  refine_btn:   string;
  refine_hint:  string;
  react_hint:   string;
  /* Header labels */
  saved_items:  string;
  gift_for:     (name: string) => string;
}

const translations: Record<LangCode, Strings> = {

  /* ─── English ─────────────────────────────────────────────────── */
  en: {
    landing_tagline:              "Tell me who you're shopping for. I'll find the perfect gift.",
    landing_who_label:            "Who are you gifting?",
    landing_name_placeholder:     "Their first name…",
    landing_occasion_label:       "Occasion",
    landing_occasion_placeholder: "Select an occasion…",
    landing_cta:                  "Find the perfect gift →",
    landing_footer:               "Free · No account needed · Takes about 2 minutes",
    greeting: (name, occasion) =>
      `Hi! Let's find the perfect ${occasion} gift for ${name}.\n\nJust a few quick questions so I can nail it.`,
    q_name:
      "Hi! I'm your personal gift concierge. I'll ask a few quick questions to find something they'll genuinely love.\n\nWho are we shopping for?",
    q_occasion:       (n) => `Nice! What's the occasion for ${n}?`,
    q_relation:       (n) => `And what's your relationship with ${n}?`,
    q_age:            (n) => `How old is ${n}?`,
    q_budget:             "What's your budget? No wrong answer — there are great options at every level.",
    q_interests:      (n) =>
      `What are ${n}'s hobbies and passions?\n\nPick from the list — and if something isn't there, type it in the box at the bottom (e.g. "cars", "Formula 1", "surfing").`,
    q_interestDetail: (top, ex) =>
      `You said ${top} — now help me get specific. The more precise you are, the better the gift.\n\n${ex}\n\nOr press Skip if you've said enough already.`,
    q_style:      (n) => `How would you describe ${n}'s taste and style?`,
    q_wishlist:   (n) =>
      `Has ${n} mentioned anything they've been wanting lately? Even a vague hint is gold.\n\n(e.g. "she keeps saying she needs a good knife set", "he's obsessed with that Dyson fan")`,
    q_avoid:      (n) => `Any no-go zones for ${n}? Tap everything that applies — or skip.`,
    loading_matching:     (n) => `Matching gifts to ${n}'s profile…`,
    loading_finalising:       "Finalising your top picks…",
    skip:                 "Skip",
    send:                 "Send",
    type_placeholder:     "Type here…",
    type_age_placeholder: "e.g. 32",
    other_placeholder:    "Other (e.g. cars, Formula 1…)",
    continue_btn:         "Continue →",
    gift_ideas:     "Gift Ideas",
    why_this:       "Why this?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Choose this",
    chosen:         "✓ Chosen",
    copy_all:       "📋 Copy all",
    copied:         "✓ Copied!",
    no_suggestions: "Suggestions will appear here once the concierge has enough context.",
    react_love:      "Love it",
    react_owned:     "Own it",
    react_not_style: "Not for them",
    new_search:      "New search",
    history:         "History",
    back_home:       "← Home",
    switch_to_local:   "Switch to local language",
    switch_to_english: "Switch to English",
    years_old:          "years old",
    next_btn:           "Next →",
    pick_at_least_one:  "Pick or type at least one",
    none_apply:         "None apply",
    great_noted:        "Great, noted →",
    add_hint_first:     "Add a hint first",
    chat_placeholder:   "Ask follow-up questions, refine suggestions…",
    confirm_n_selected: (n) => `Confirm (${n} selected)`,
    hint_quality:          "This single answer can completely change the quality of suggestions.",
    wishlist_placeholder:  'e.g. "she mentioned wanting AirPods" or "he keeps looking at a Kindle"…',
    history_title:       "Recent Searches",
    history_empty:       "No searches yet.",
    history_footer:      "Saved locally in your browser",
    error_generic:       "Something went wrong — please try again.",
    budget_under:        "Under",
    budget_above:        "+",
    n_picks:             (n) => `${n} picks`,
    refine_btn:          "Refine for me →",
    refine_hint:         "based on your reactions",
    react_hint:          "React to refine the next round",
    saved_items:         "Saved",
    gift_for:            (name) => `Gift for ${name}`,
  },

  /* ─── Italian ─────────────────────────────────────────────────── */
  it: {
    landing_tagline:              "Dimmi per chi stai cercando. Troverò il regalo perfetto.",
    landing_who_label:            "Per chi è il regalo?",
    landing_name_placeholder:     "Il suo nome…",
    landing_occasion_label:       "Occasione",
    landing_occasion_placeholder: "Seleziona un'occasione…",
    landing_cta:                  "Trova il regalo perfetto →",
    landing_footer:               "Gratuito · Senza registrazione · Impiega circa 2 minuti",
    greeting: (name, occasion) =>
      `Ciao! Troviamo il regalo perfetto di ${occasion} per ${name}.\n\nSolo qualche domanda rapida per centrare il bersaglio.`,
    q_name:
      "Ciao! Sono il tuo concierge personale per i regali. Ti farò qualche domanda veloce per trovare qualcosa che piacerà davvero.\n\nPer chi stai cercando un regalo?",
    q_occasion:       (n) => `Perfetto! Qual è l'occasione per ${n}?`,
    q_relation:       (n) => `Che rapporto hai con ${n}?`,
    q_age:            (n) => `Quanti anni ha ${n}?`,
    q_budget:             "Qual è il tuo budget? Non c'è una risposta sbagliata — ci sono ottime opzioni per ogni fascia di prezzo.",
    q_interests:      (n) =>
      `Quali sono gli hobby e le passioni di ${n}?\n\nScegli dalla lista — e se manca qualcosa, scrivilo nel campo in basso (es. "auto", "Formula 1", "surf").`,
    q_interestDetail: (top, ex) =>
      `Hai detto ${top} — ora aiutami a essere più preciso. Più dettagli mi dai, migliore sarà il regalo.\n\n${ex}\n\nOppure premi Salta se hai già detto abbastanza.`,
    q_style:      (n) => `Come descriveresti il gusto e lo stile di ${n}?`,
    q_wishlist:   (n) =>
      `${n} ha accennato a qualcosa che vorrebbe ultimamente? Anche un piccolo indizio è prezioso.\n\n(es. "dice sempre che ha bisogno di un buon set di coltelli", "è fissato con il Dyson")`,
    q_avoid:      (n) => `Ci sono cose da evitare per ${n}? Seleziona tutto quello che si applica — oppure salta.`,
    loading_matching:     (n) => `Abbinamento dei regali al profilo di ${n}…`,
    loading_finalising:       "Selezione delle migliori proposte…",
    skip:                 "Salta",
    send:                 "Invia",
    type_placeholder:     "Scrivi qui…",
    type_age_placeholder: "es. 32",
    other_placeholder:    "Altro (es. auto, Formula 1…)",
    continue_btn:         "Continua →",
    gift_ideas:     "Idee Regalo",
    why_this:       "Perché questo?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Scegli questo",
    chosen:         "✓ Scelto",
    copy_all:       "📋 Copia tutto",
    copied:         "✓ Copiato!",
    no_suggestions: "I suggerimenti appariranno qui quando il concierge avrà abbastanza informazioni.",
    react_love:      "Lo adoro",
    react_owned:     "Ce l'ha già",
    react_not_style: "Non è il suo stile",
    new_search:      "Nuova ricerca",
    history:         "Cronologia",
    back_home:       "← Inizio",
    switch_to_local:   "Passa all'italiano",
    switch_to_english: "Passa all'inglese",
    years_old:          "anni",
    next_btn:           "Avanti →",
    pick_at_least_one:  "Seleziona o scrivi almeno uno",
    none_apply:         "Nessuno si applica",
    great_noted:        "Perfetto, annotato →",
    add_hint_first:     "Aggiungi prima un indizio",
    chat_placeholder:   "Fai domande, affina i suggerimenti…",
    confirm_n_selected: (n) => `Conferma (${n} selezionati)`,
    hint_quality:          "Questa singola risposta può cambiare completamente la qualità dei suggerimenti.",
    wishlist_placeholder:  'es. "dice sempre di voler gli AirPods", "è fissato con il Kindle"…',
    history_title:       "Ricerche Recenti",
    history_empty:       "Nessuna ricerca ancora.",
    history_footer:      "Salvato localmente nel tuo browser",
    error_generic:       "Qualcosa è andato storto — riprova.",
    budget_under:        "Meno di",
    budget_above:        "e oltre",
    n_picks:             (n) => `${n} idee`,
    refine_btn:          "Raffina per me →",
    refine_hint:         "basato sulle tue reazioni",
    react_hint:          "Reagisci per affinare il prossimo giro",
    saved_items:         "Salvati",
    gift_for:            (name) => `Regalo per ${name}`,
  },

  /* ─── French ──────────────────────────────────────────────────── */
  fr: {
    landing_tagline:              "Dites-moi pour qui vous cherchez. Je trouverai le cadeau parfait.",
    landing_who_label:            "Pour qui est le cadeau ?",
    landing_name_placeholder:     "Son prénom…",
    landing_occasion_label:       "Occasion",
    landing_occasion_placeholder: "Sélectionnez une occasion…",
    landing_cta:                  "Trouver le cadeau parfait →",
    landing_footer:               "Gratuit · Sans inscription · Environ 2 minutes",
    greeting: (name, occasion) =>
      `Bonjour ! Trouvons le cadeau parfait de ${occasion} pour ${name}.\n\nQuelques questions rapides pour viser juste.`,
    q_name:
      "Bonjour ! Je suis votre concierge cadeaux personnel. Quelques questions rapides pour trouver quelque chose qu'il ou elle adorera vraiment.\n\nPour qui cherchons-nous un cadeau ?",
    q_occasion:       (n) => `Parfait ! Quelle est l'occasion pour ${n} ?`,
    q_relation:       (n) => `Et quel est votre lien avec ${n} ?`,
    q_age:            (n) => `Quel âge a ${n} ?`,
    q_budget:             "Quel est votre budget ? Il n'y a pas de mauvaise réponse — il y a de bonnes options à tous les niveaux.",
    q_interests:      (n) =>
      `Quels sont les hobbies et passions de ${n} ?\n\nChoisissez dans la liste — et si quelque chose manque, tapez-le dans le champ ci-dessous (ex. "voitures", "F1", "surf").`,
    q_interestDetail: (top, ex) =>
      `Vous avez mentionné ${top} — aidez-moi à être précis. Plus vous l'êtes, meilleur sera le cadeau.\n\n${ex}\n\nOu appuyez sur Ignorer si vous avez déjà tout dit.`,
    q_style:      (n) => `Comment décririez-vous le goût et le style de ${n} ?`,
    q_wishlist:   (n) =>
      `${n} a-t-il/elle mentionné quelque chose qu'il/elle désire en ce moment ? Même une vague indication est précieuse.\n\n(ex. "elle dit toujours qu'elle a besoin d'un bon set de couteaux")`,
    q_avoid:      (n) => `Y a-t-il des choses à éviter pour ${n} ? Sélectionnez tout ce qui s'applique — ou ignorez.`,
    loading_matching:     (n) => `Sélection des cadeaux pour le profil de ${n}…`,
    loading_finalising:       "Finalisation de vos meilleures options…",
    skip:                 "Ignorer",
    send:                 "Envoyer",
    type_placeholder:     "Écrivez ici…",
    type_age_placeholder: "ex. 32",
    other_placeholder:    "Autre (ex. voitures, F1…)",
    continue_btn:         "Continuer →",
    gift_ideas:     "Idées Cadeaux",
    why_this:       "Pourquoi ce choix ?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Choisir ceci",
    chosen:         "✓ Choisi",
    copy_all:       "📋 Tout copier",
    copied:         "✓ Copié !",
    no_suggestions: "Les suggestions apparaîtront ici dès que le concierge aura assez de contexte.",
    react_love:      "J'adore",
    react_owned:     "Il/elle l'a déjà",
    react_not_style: "Pas son style",
    new_search:      "Nouvelle recherche",
    history:         "Historique",
    back_home:       "← Accueil",
    switch_to_local:   "Passer au français",
    switch_to_english: "Passer à l'anglais",
    years_old:          "ans",
    next_btn:           "Suivant →",
    pick_at_least_one:  "Choisissez ou tapez au moins un",
    none_apply:         "Aucun ne s'applique",
    great_noted:        "Noté, merci →",
    add_hint_first:     "Ajoutez d'abord un indice",
    chat_placeholder:   "Posez des questions, affinez les suggestions…",
    confirm_n_selected: (n) => `Confirmer (${n} sélectionné${n > 1 ? "s" : ""})`,
    hint_quality:          "Cette seule réponse peut complètement changer la qualité des suggestions.",
    wishlist_placeholder:  'ex. "elle parle toujours d\'AirPods", "il ne cesse de regarder un Kindle"…',
    history_title:       "Recherches Récentes",
    history_empty:       "Aucune recherche pour l'instant.",
    history_footer:      "Sauvegardé localement dans votre navigateur",
    error_generic:       "Une erreur s'est produite — veuillez réessayer.",
    budget_under:        "Moins de",
    budget_above:        "et plus",
    n_picks:             (n) => `${n} idées`,
    refine_btn:          "Affiner pour moi →",
    refine_hint:         "selon vos réactions",
    react_hint:          "Réagissez pour affiner le prochain tour",
    saved_items:         "Sauvegardés",
    gift_for:            (name) => `Cadeau pour ${name}`,
  },

  /* ─── German ──────────────────────────────────────────────────── */
  de: {
    landing_tagline:              "Sag mir, für wen du suchst. Ich finde das perfekte Geschenk.",
    landing_who_label:            "Für wen ist das Geschenk?",
    landing_name_placeholder:     "Ihr Vorname…",
    landing_occasion_label:       "Anlass",
    landing_occasion_placeholder: "Anlass auswählen…",
    landing_cta:                  "Das perfekte Geschenk finden →",
    landing_footer:               "Kostenlos · Kein Konto nötig · Dauert ca. 2 Minuten",
    greeting: (name, occasion) =>
      `Hallo! Lass uns das perfekte ${occasion}-Geschenk für ${name} finden.\n\nNur ein paar kurze Fragen, damit ich genau treffe.`,
    q_name:
      "Hallo! Ich bin dein persönlicher Geschenke-Concierge. Ein paar kurze Fragen, um etwas zu finden, das wirklich begeistert.\n\nFür wen suchen wir ein Geschenk?",
    q_occasion:       (n) => `Super! Was ist der Anlass für ${n}?`,
    q_relation:       (n) => `Und in welchem Verhältnis stehst du zu ${n}?`,
    q_age:            (n) => `Wie alt ist ${n}?`,
    q_budget:             "Was ist dein Budget? Es gibt keine falsche Antwort — es gibt tolle Optionen in jeder Preisklasse.",
    q_interests:      (n) =>
      `Was sind die Hobbys und Leidenschaften von ${n}?\n\nWähle aus der Liste — und falls etwas fehlt, tippe es ins Feld unten ein (z.B. "Autos", "Formel 1", "Surfen").`,
    q_interestDetail: (top, ex) =>
      `Du hast ${top} genannt — hilf mir, genauer zu werden. Je präziser, desto besser das Geschenk.\n\n${ex}\n\nOder drücke Überspringen, wenn du genug gesagt hast.`,
    q_style:      (n) => `Wie würdest du den Geschmack und Stil von ${n} beschreiben?`,
    q_wishlist:   (n) =>
      `Hat ${n} zuletzt etwas erwähnt, das er/sie gerne hätte? Selbst ein kleiner Hinweis ist Gold wert.\n\n(z.B. "er sagt immer, er braucht ein gutes Messerset")`,
    q_avoid:      (n) => `Gibt es Dinge, die man für ${n} vermeiden sollte? Wähle alles Zutreffende — oder überspringe.`,
    loading_matching:     (n) => `Geschenke werden dem Profil von ${n} zugeordnet…`,
    loading_finalising:       "Die besten Vorschläge werden zusammengestellt…",
    skip:                 "Überspringen",
    send:                 "Senden",
    type_placeholder:     "Hier eingeben…",
    type_age_placeholder: "z.B. 32",
    other_placeholder:    "Anderes (z.B. Autos, Formel 1…)",
    continue_btn:         "Weiter →",
    gift_ideas:     "Geschenkideen",
    why_this:       "Warum dieses?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Dieses wählen",
    chosen:         "✓ Gewählt",
    copy_all:       "📋 Alles kopieren",
    copied:         "✓ Kopiert!",
    no_suggestions: "Vorschläge erscheinen hier, sobald der Concierge genug Kontext hat.",
    react_love:      "Ich liebe es",
    react_owned:     "Hat er/sie schon",
    react_not_style: "Nicht ihr/sein Stil",
    new_search:      "Neue Suche",
    history:         "Verlauf",
    back_home:       "← Startseite",
    switch_to_local:   "Auf Deutsch wechseln",
    switch_to_english: "Auf Englisch wechseln",
    years_old:          "Jahre alt",
    next_btn:           "Weiter →",
    pick_at_least_one:  "Wähle oder tippe mindestens einen",
    none_apply:         "Keines trifft zu",
    great_noted:        "Super, notiert →",
    add_hint_first:     "Füge zuerst einen Hinweis hinzu",
    chat_placeholder:   "Stelle Folgefragen, verfeinere Vorschläge…",
    confirm_n_selected: (n) => `Bestätigen (${n} ausgewählt)`,
    hint_quality:          "Diese eine Antwort kann die Qualität der Vorschläge komplett verändern.",
    wishlist_placeholder:  'z.B. "sie spricht immer von AirPods", "er schaut immer wieder einen Kindle an"…',
    history_title:       "Letzte Suchen",
    history_empty:       "Noch keine Suchen.",
    history_footer:      "Lokal in deinem Browser gespeichert",
    error_generic:       "Etwas ist schiefgelaufen — bitte versuche es erneut.",
    budget_under:        "Unter",
    budget_above:        "und mehr",
    n_picks:             (n) => `${n} Ideen`,
    refine_btn:          "Für mich verfeinern →",
    refine_hint:         "basierend auf deinen Reaktionen",
    react_hint:          "Reagiere, um die nächste Runde zu verfeinern",
    saved_items:         "Gespeichert",
    gift_for:            (name) => `Geschenk für ${name}`,
  },

  /* ─── Spanish ─────────────────────────────────────────────────── */
  es: {
    landing_tagline:              "Dime para quién buscas. Encontraré el regalo perfecto.",
    landing_who_label:            "¿Para quién es el regalo?",
    landing_name_placeholder:     "Su nombre…",
    landing_occasion_label:       "Ocasión",
    landing_occasion_placeholder: "Selecciona una ocasión…",
    landing_cta:                  "Encontrar el regalo perfecto →",
    landing_footer:               "Gratis · Sin registro · Tarda unos 2 minutos",
    greeting: (name, occasion) =>
      `¡Hola! Encontremos el regalo perfecto de ${occasion} para ${name}.\n\nSolo unas preguntas rápidas para dar en el clavo.`,
    q_name:
      "¡Hola! Soy tu consejero personal de regalos. Te haré unas preguntas rápidas para encontrar algo que realmente le encantará.\n\n¿Para quién estamos buscando un regalo?",
    q_occasion:       (n) => `¡Genial! ¿Cuál es la ocasión para ${n}?`,
    q_relation:       (n) => `¿Y cuál es tu relación con ${n}?`,
    q_age:            (n) => `¿Cuántos años tiene ${n}?`,
    q_budget:             "¿Cuál es tu presupuesto? No hay respuesta incorrecta — hay buenas opciones en todos los niveles.",
    q_interests:      (n) =>
      `¿Cuáles son los hobbies y pasiones de ${n}?\n\nElige de la lista — y si falta algo, escríbelo en el campo de abajo (ej. "coches", "Fórmula 1", "surf").`,
    q_interestDetail: (top, ex) =>
      `Mencionaste ${top} — ahora ayúdame a ser más preciso. Cuanto más específico, mejor el regalo.\n\n${ex}\n\nO pulsa Omitir si ya has dicho suficiente.`,
    q_style:      (n) => `¿Cómo describirías el gusto y estilo de ${n}?`,
    q_wishlist:   (n) =>
      `¿Ha mencionado ${n} algo que desee últimamente? Incluso una pista vaga es valiosa.\n\n(ej. "siempre dice que necesita un buen juego de cuchillos")`,
    q_avoid:      (n) => `¿Hay cosas que evitar para ${n}? Toca todo lo que aplique — u omite.`,
    loading_matching:     (n) => `Buscando regalos para el perfil de ${n}…`,
    loading_finalising:       "Finalizando las mejores opciones…",
    skip:                 "Omitir",
    send:                 "Enviar",
    type_placeholder:     "Escribe aquí…",
    type_age_placeholder: "ej. 32",
    other_placeholder:    "Otro (ej. coches, Fórmula 1…)",
    continue_btn:         "Continuar →",
    gift_ideas:     "Ideas de Regalo",
    why_this:       "¿Por qué este?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Elegir este",
    chosen:         "✓ Elegido",
    copy_all:       "📋 Copiar todo",
    copied:         "✓ ¡Copiado!",
    no_suggestions: "Las sugerencias aparecerán aquí cuando el consejero tenga suficiente contexto.",
    react_love:      "Me encanta",
    react_owned:     "Ya lo tiene",
    react_not_style: "No es su estilo",
    new_search:      "Nueva búsqueda",
    history:         "Historial",
    back_home:       "← Inicio",
    switch_to_local:   "Cambiar al español",
    switch_to_english: "Cambiar al inglés",
    years_old:          "años",
    next_btn:           "Siguiente →",
    pick_at_least_one:  "Elige o escribe al menos uno",
    none_apply:         "Ninguno aplica",
    great_noted:        "Anotado →",
    add_hint_first:     "Añade primero una pista",
    chat_placeholder:   "Haz preguntas, refina las sugerencias…",
    confirm_n_selected: (n) => `Confirmar (${n} seleccionado${n > 1 ? "s" : ""})`,
    hint_quality:          "Esta sola respuesta puede cambiar completamente la calidad de las sugerencias.",
    wishlist_placeholder:  'ej. "siempre habla de los AirPods", "siempre está mirando un Kindle"…',
    history_title:       "Búsquedas Recientes",
    history_empty:       "Aún no hay búsquedas.",
    history_footer:      "Guardado localmente en tu navegador",
    error_generic:       "Algo salió mal — por favor inténtalo de nuevo.",
    budget_under:        "Menos de",
    budget_above:        "y más",
    n_picks:             (n) => `${n} ideas`,
    refine_btn:          "Refinar para mí →",
    refine_hint:         "según tus reacciones",
    react_hint:          "Reacciona para refinar la próxima ronda",
    saved_items:         "Guardados",
    gift_for:            (name) => `Regalo para ${name}`,
  },

  /* ─── Portuguese ──────────────────────────────────────────────── */
  pt: {
    landing_tagline:              "Diz-me para quem estás a procurar. Vou encontrar o presente perfeito.",
    landing_who_label:            "Para quem é o presente?",
    landing_name_placeholder:     "O seu nome…",
    landing_occasion_label:       "Ocasião",
    landing_occasion_placeholder: "Seleciona uma ocasião…",
    landing_cta:                  "Encontrar o presente perfeito →",
    landing_footer:               "Gratuito · Sem registo · Demora cerca de 2 minutos",
    greeting: (name, occasion) =>
      `Olá! Vamos encontrar o presente perfeito de ${occasion} para ${name}.\n\nApenas algumas perguntas rápidas para acertar em cheio.`,
    q_name:
      "Olá! Sou o teu concierge pessoal de presentes. Vou fazer algumas perguntas rápidas para encontrar algo que a pessoa vai adorar.\n\nPara quem estamos a procurar um presente?",
    q_occasion:       (n) => `Ótimo! Qual é a ocasião para ${n}?`,
    q_relation:       (n) => `E qual é a tua relação com ${n}?`,
    q_age:            (n) => `Quantos anos tem ${n}?`,
    q_budget:             "Qual é o teu orçamento? Não há resposta errada — há ótimas opções em todos os níveis.",
    q_interests:      (n) =>
      `Quais são os hobbies e paixões de ${n}?\n\nEscolhe da lista — e se faltar algo, escreve no campo abaixo (ex. "carros", "Fórmula 1", "surf").`,
    q_interestDetail: (top, ex) =>
      `Disseste ${top} — agora ajuda-me a ser mais preciso. Quanto mais específico fores, melhor o presente.\n\n${ex}\n\nOu prime Ignorar se já disseste o suficiente.`,
    q_style:      (n) => `Como descreves o gosto e estilo de ${n}?`,
    q_wishlist:   (n) =>
      `${n} mencionou algo que deseja ultimamente? Mesmo uma dica vaga é valiosa.\n\n(ex. "ela diz sempre que precisa de um bom conjunto de facas")`,
    q_avoid:      (n) => `Há coisas a evitar para ${n}? Toca em tudo o que se aplica — ou ignora.`,
    loading_matching:     (n) => `A combinar presentes com o perfil de ${n}…`,
    loading_finalising:       "A finalizar as melhores escolhas…",
    skip:                 "Ignorar",
    send:                 "Enviar",
    type_placeholder:     "Escreve aqui…",
    type_age_placeholder: "ex. 32",
    other_placeholder:    "Outro (ex. carros, Fórmula 1…)",
    continue_btn:         "Continuar →",
    gift_ideas:     "Ideias de Presente",
    why_this:       "Porquê este?",
    search_amazon:  "Amazon",
    search_google:  "Google",
    choose_this:    "🎉 Escolher este",
    chosen:         "✓ Escolhido",
    copy_all:       "📋 Copiar tudo",
    copied:         "✓ Copiado!",
    no_suggestions: "As sugestões aparecerão aqui quando o concierge tiver contexto suficiente.",
    react_love:      "Adoro",
    react_owned:     "Já tem",
    react_not_style: "Não é o seu estilo",
    new_search:      "Nova pesquisa",
    history:         "Histórico",
    back_home:       "← Início",
    switch_to_local:   "Mudar para português",
    switch_to_english: "Mudar para inglês",
    years_old:          "anos",
    next_btn:           "Seguinte →",
    pick_at_least_one:  "Escolhe ou escreve pelo menos um",
    none_apply:         "Nenhum se aplica",
    great_noted:        "Anotado →",
    add_hint_first:     "Adiciona primeiro uma dica",
    chat_placeholder:   "Faz perguntas, refina as sugestões…",
    confirm_n_selected: (n) => `Confirmar (${n} selecionado${n > 1 ? "s" : ""})`,
    hint_quality:          "Esta única resposta pode mudar completamente a qualidade das sugestões.",
    wishlist_placeholder:  'ex. "ela fala sempre nos AirPods", "ele está sempre a olhar para um Kindle"…',
    history_title:       "Pesquisas Recentes",
    history_empty:       "Ainda sem pesquisas.",
    history_footer:      "Guardado localmente no teu navegador",
    error_generic:       "Algo correu mal — por favor tenta novamente.",
    budget_under:        "Menos de",
    budget_above:        "e acima",
    n_picks:             (n) => `${n} ideias`,
    refine_btn:          "Refinar para mim →",
    refine_hint:         "com base nas tuas reações",
    react_hint:          "Reage para refinar a próxima ronda",
    saved_items:         "Guardados",
    gift_for:            (name) => `Presente para ${name}`,
  },
};

export function t(lang: LangCode): Strings {
  return translations[lang] ?? translations.en;
}

/** Translated occasion labels — value stays English internally, only display changes */
const OCCASION_TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    "Birthday": "Birthday", "Christmas": "Christmas", "Valentine's Day": "Valentine's Day",
    "Mother's Day": "Mother's Day", "Father's Day": "Father's Day", "Graduation": "Graduation",
    "Wedding": "Wedding", "Anniversary": "Anniversary", "Housewarming": "Housewarming",
    "Baby Shower": "Baby Shower", "Just Because": "Just Because", "Other": "Other",
  },
  it: {
    "Birthday": "Compleanno", "Christmas": "Natale", "Valentine's Day": "San Valentino",
    "Mother's Day": "Festa della Mamma", "Father's Day": "Festa del Papà", "Graduation": "Laurea",
    "Wedding": "Matrimonio", "Anniversary": "Anniversario", "Housewarming": "Casa Nuova",
    "Baby Shower": "Baby Shower", "Just Because": "Così, per farti felice", "Other": "Altro",
  },
  fr: {
    "Birthday": "Anniversaire", "Christmas": "Noël", "Valentine's Day": "Saint-Valentin",
    "Mother's Day": "Fête des Mères", "Father's Day": "Fête des Pères", "Graduation": "Remise de diplôme",
    "Wedding": "Mariage", "Anniversary": "Anniversaire de couple", "Housewarming": "Pendaison de crémaillère",
    "Baby Shower": "Baby Shower", "Just Because": "Juste comme ça", "Other": "Autre",
  },
  de: {
    "Birthday": "Geburtstag", "Christmas": "Weihnachten", "Valentine's Day": "Valentinstag",
    "Mother's Day": "Muttertag", "Father's Day": "Vatertag", "Graduation": "Abschluss",
    "Wedding": "Hochzeit", "Anniversary": "Jahrestag", "Housewarming": "Einzugsparty",
    "Baby Shower": "Babyparty", "Just Because": "Einfach so", "Other": "Sonstiges",
  },
  es: {
    "Birthday": "Cumpleaños", "Christmas": "Navidad", "Valentine's Day": "San Valentín",
    "Mother's Day": "Día de la Madre", "Father's Day": "Día del Padre", "Graduation": "Graduación",
    "Wedding": "Boda", "Anniversary": "Aniversario", "Housewarming": "Casa nueva",
    "Baby Shower": "Baby Shower", "Just Because": "Sin motivo", "Other": "Otro",
  },
  pt: {
    "Birthday": "Aniversário", "Christmas": "Natal", "Valentine's Day": "Dia dos Namorados",
    "Mother's Day": "Dia da Mãe", "Father's Day": "Dia do Pai", "Graduation": "Formatura",
    "Wedding": "Casamento", "Anniversary": "Aniversário de casal", "Housewarming": "Casa nova",
    "Baby Shower": "Chá de bebê", "Just Because": "Só porque sim", "Other": "Outro",
  },
};

/** Returns the translated display label for an occasion. Falls back to the English value. */
export function tOccasion(lang: LangCode, occasion: string): string {
  return OCCASION_TRANSLATIONS[lang]?.[occasion] ?? occasion;
}

/* ──────────────────── Relation translations ───────────────────── */

const RELATION_TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    "Partner / Spouse": "Partner / Spouse", "Best Friend": "Best Friend",
    "Friend": "Friend", "Parent": "Parent", "Sibling": "Sibling",
    "Child": "Child", "Grandparent": "Grandparent",
    "Colleague / Boss": "Colleague / Boss", "Other": "Other",
  },
  it: {
    "Partner / Spouse": "Partner / Coniuge", "Best Friend": "Migliore Amico/a",
    "Friend": "Amico/a", "Parent": "Genitore", "Sibling": "Fratello/Sorella",
    "Child": "Figlio/a", "Grandparent": "Nonno/a",
    "Colleague / Boss": "Collega / Capo", "Other": "Altro",
  },
  fr: {
    "Partner / Spouse": "Partenaire / Époux(se)", "Best Friend": "Meilleur(e) ami(e)",
    "Friend": "Ami(e)", "Parent": "Parent", "Sibling": "Frère / Sœur",
    "Child": "Enfant", "Grandparent": "Grand-parent",
    "Colleague / Boss": "Collègue / Chef", "Other": "Autre",
  },
  de: {
    "Partner / Spouse": "Partner / Ehepartner", "Best Friend": "Beste/r Freund/in",
    "Friend": "Freund / Freundin", "Parent": "Elternteil", "Sibling": "Geschwister",
    "Child": "Kind", "Grandparent": "Großelternteil",
    "Colleague / Boss": "Kollege / Chef", "Other": "Sonstiges",
  },
  es: {
    "Partner / Spouse": "Pareja / Cónyuge", "Best Friend": "Mejor amigo/a",
    "Friend": "Amigo/a", "Parent": "Padre / Madre", "Sibling": "Hermano/a",
    "Child": "Hijo/a", "Grandparent": "Abuelo/a",
    "Colleague / Boss": "Compañero / Jefe", "Other": "Otro",
  },
  pt: {
    "Partner / Spouse": "Parceiro/a / Cônjuge", "Best Friend": "Melhor amigo/a",
    "Friend": "Amigo/a", "Parent": "Pai / Mãe", "Sibling": "Irmão/ã",
    "Child": "Filho/a", "Grandparent": "Avô / Avó",
    "Colleague / Boss": "Colega / Chefe", "Other": "Outro",
  },
};

export function tRelation(lang: LangCode, relation: string): string {
  return RELATION_TRANSLATIONS[lang]?.[relation] ?? relation;
}

/* ──────────────────── Interest translations ───────────────────── */

const INTEREST_TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    "Cooking & Food": "Cooking & Food", "Fine Dining & Restaurants": "Fine Dining & Restaurants",
    "Travel & Exploring": "Travel & Exploring", "Fitness & Gym": "Fitness & Gym",
    "Running & Cycling": "Running & Cycling", "Yoga & Mindfulness": "Yoga & Mindfulness",
    "Books & Reading": "Books & Reading", "Gaming": "Gaming",
    "Art & Painting": "Art & Painting", "Music & Concerts": "Music & Concerts",
    "Tech & Gadgets": "Tech & Gadgets", "Fashion & Style": "Fashion & Style",
    "Beauty & Skincare": "Beauty & Skincare", "Outdoors & Hiking": "Outdoors & Hiking",
    "Photography": "Photography", "Home & Interior": "Home & Interior",
    "Wine & Cocktails": "Wine & Cocktails", "Coffee & Tea": "Coffee & Tea",
    "Plants & Gardening": "Plants & Gardening", "Film & TV Series": "Film & TV Series",
    "Podcasts & Learning": "Podcasts & Learning", "Sustainability & Eco": "Sustainability & Eco",
  },
  it: {
    "Cooking & Food": "Cucina & Cibo", "Fine Dining & Restaurants": "Ristorazione",
    "Travel & Exploring": "Viaggi", "Fitness & Gym": "Fitness & Palestra",
    "Running & Cycling": "Corsa & Ciclismo", "Yoga & Mindfulness": "Yoga & Benessere",
    "Books & Reading": "Libri & Lettura", "Gaming": "Gaming",
    "Art & Painting": "Arte & Pittura", "Music & Concerts": "Musica & Concerti",
    "Tech & Gadgets": "Tech & Gadget", "Fashion & Style": "Moda & Stile",
    "Beauty & Skincare": "Bellezza & Skincare", "Outdoors & Hiking": "Outdoor & Trekking",
    "Photography": "Fotografia", "Home & Interior": "Casa & Arredamento",
    "Wine & Cocktails": "Vino & Cocktail", "Coffee & Tea": "Caffè & Tè",
    "Plants & Gardening": "Piante & Giardinaggio", "Film & TV Series": "Film & Serie TV",
    "Podcasts & Learning": "Podcast & Formazione", "Sustainability & Eco": "Sostenibilità",
  },
  fr: {
    "Cooking & Food": "Cuisine & Gastronomie", "Fine Dining & Restaurants": "Gastronomie",
    "Travel & Exploring": "Voyages", "Fitness & Gym": "Fitness & Salle de sport",
    "Running & Cycling": "Course & Cyclisme", "Yoga & Mindfulness": "Yoga & Pleine conscience",
    "Books & Reading": "Livres & Lecture", "Gaming": "Gaming",
    "Art & Painting": "Art & Peinture", "Music & Concerts": "Musique & Concerts",
    "Tech & Gadgets": "Tech & Gadgets", "Fashion & Style": "Mode & Style",
    "Beauty & Skincare": "Beauté & Soins", "Outdoors & Hiking": "Plein air & Randonnée",
    "Photography": "Photographie", "Home & Interior": "Maison & Intérieur",
    "Wine & Cocktails": "Vin & Cocktails", "Coffee & Tea": "Café & Thé",
    "Plants & Gardening": "Plantes & Jardinage", "Film & TV Series": "Cinéma & Séries",
    "Podcasts & Learning": "Podcasts & Formation", "Sustainability & Eco": "Développement durable",
  },
  de: {
    "Cooking & Food": "Kochen & Essen", "Fine Dining & Restaurants": "Restaurants & Gastronomie",
    "Travel & Exploring": "Reisen & Abenteuer", "Fitness & Gym": "Fitness & Gym",
    "Running & Cycling": "Laufen & Radfahren", "Yoga & Mindfulness": "Yoga & Achtsamkeit",
    "Books & Reading": "Bücher & Lesen", "Gaming": "Gaming",
    "Art & Painting": "Kunst & Malerei", "Music & Concerts": "Musik & Konzerte",
    "Tech & Gadgets": "Tech & Gadgets", "Fashion & Style": "Mode & Stil",
    "Beauty & Skincare": "Beauty & Pflege", "Outdoors & Hiking": "Outdoor & Wandern",
    "Photography": "Fotografie", "Home & Interior": "Heim & Einrichtung",
    "Wine & Cocktails": "Wein & Cocktails", "Coffee & Tea": "Kaffee & Tee",
    "Plants & Gardening": "Pflanzen & Garten", "Film & TV Series": "Film & Serien",
    "Podcasts & Learning": "Podcasts & Weiterbildung", "Sustainability & Eco": "Nachhaltigkeit",
  },
  es: {
    "Cooking & Food": "Cocina & Gastronomía", "Fine Dining & Restaurants": "Restaurantes",
    "Travel & Exploring": "Viajes", "Fitness & Gym": "Fitness & Gimnasio",
    "Running & Cycling": "Correr & Ciclismo", "Yoga & Mindfulness": "Yoga & Bienestar",
    "Books & Reading": "Libros & Lectura", "Gaming": "Gaming",
    "Art & Painting": "Arte & Pintura", "Music & Concerts": "Música & Conciertos",
    "Tech & Gadgets": "Tech & Gadgets", "Fashion & Style": "Moda & Estilo",
    "Beauty & Skincare": "Belleza & Cuidado", "Outdoors & Hiking": "Naturaleza & Senderismo",
    "Photography": "Fotografía", "Home & Interior": "Hogar & Decoración",
    "Wine & Cocktails": "Vino & Cócteles", "Coffee & Tea": "Café & Té",
    "Plants & Gardening": "Plantas & Jardín", "Film & TV Series": "Cine & Series",
    "Podcasts & Learning": "Podcasts & Aprendizaje", "Sustainability & Eco": "Sostenibilidad",
  },
  pt: {
    "Cooking & Food": "Culinária & Gastronomia", "Fine Dining & Restaurants": "Restaurantes",
    "Travel & Exploring": "Viagens", "Fitness & Gym": "Fitness & Ginásio",
    "Running & Cycling": "Corrida & Ciclismo", "Yoga & Mindfulness": "Yoga & Bem-estar",
    "Books & Reading": "Livros & Leitura", "Gaming": "Gaming",
    "Art & Painting": "Arte & Pintura", "Music & Concerts": "Música & Concertos",
    "Tech & Gadgets": "Tech & Gadgets", "Fashion & Style": "Moda & Estilo",
    "Beauty & Skincare": "Beleza & Cuidados", "Outdoors & Hiking": "Outdoor & Caminhada",
    "Photography": "Fotografia", "Home & Interior": "Casa & Decoração",
    "Wine & Cocktails": "Vinho & Cocktails", "Coffee & Tea": "Café & Chá",
    "Plants & Gardening": "Plantas & Jardim", "Film & TV Series": "Cinema & Séries",
    "Podcasts & Learning": "Podcasts & Aprendizagem", "Sustainability & Eco": "Sustentabilidade",
  },
};

export function tInterest(lang: LangCode, interest: string): string {
  return INTEREST_TRANSLATIONS[lang]?.[interest] ?? interest;
}

/* ──────────────────── Style translations ──────────────────────── */

type StyleDisplay = { label: string; sub: string };

const STYLE_TRANSLATIONS: Record<LangCode, Record<string, StyleDisplay>> = {
  en: {
    "Minimalist & clean":       { label: "Minimalist & clean",       sub: "Less is more — quality over quantity"      },
    "Classic & timeless":       { label: "Classic & timeless",       sub: "Elegant, well-made, never trendy"          },
    "Trendy & fashion-forward": { label: "Trendy & fashion-forward", sub: "Always on the latest thing"                },
    "Quirky & unique":          { label: "Quirky & unique",          sub: "Unusual finds, conversation pieces"        },
    "Outdoorsy & functional":   { label: "Outdoorsy & functional",   sub: "Practical gear for an active life"         },
    "Maximalist & bold":        { label: "Maximalist & bold",        sub: "More colour, more personality"             },
  },
  it: {
    "Minimalist & clean":       { label: "Minimalista & pulito",     sub: "Meno è meglio — qualità più che quantità"  },
    "Classic & timeless":       { label: "Classico & senza tempo",   sub: "Elegante, ben fatto, mai di tendenza"      },
    "Trendy & fashion-forward": { label: "Trendy & all'avanguardia", sub: "Sempre sull'ultima novità"                 },
    "Quirky & unique":          { label: "Originale & unico",        sub: "Oggetti insoliti, che fanno parlare"       },
    "Outdoorsy & functional":   { label: "Outdoor & funzionale",     sub: "Gear pratico per una vita attiva"          },
    "Maximalist & bold":        { label: "Massimalista & audace",    sub: "Più colore, più personalità"               },
  },
  fr: {
    "Minimalist & clean":       { label: "Minimaliste & épuré",      sub: "Moins c'est plus — qualité sur quantité"   },
    "Classic & timeless":       { label: "Classique & intemporel",   sub: "Élégant, bien fait, jamais démodé"         },
    "Trendy & fashion-forward": { label: "Tendance & avant-gardiste",sub: "Toujours sur la dernière nouveauté"        },
    "Quirky & unique":          { label: "Original & unique",        sub: "Objets insolites, pièces de conversation"  },
    "Outdoorsy & functional":   { label: "Outdoor & fonctionnel",    sub: "Équipement pratique pour vie active"       },
    "Maximalist & bold":        { label: "Maximaliste & audacieux",  sub: "Plus de couleurs, plus de personnalité"    },
  },
  de: {
    "Minimalist & clean":       { label: "Minimalistisch & schlicht",sub: "Weniger ist mehr — Qualität vor Quantität" },
    "Classic & timeless":       { label: "Klassisch & zeitlos",      sub: "Elegant, gut verarbeitet, nie trendy"      },
    "Trendy & fashion-forward": { label: "Trendy & modebewusst",     sub: "Immer auf dem neuesten Stand"              },
    "Quirky & unique":          { label: "Ausgefallen & einzigartig",sub: "Ungewöhnliche Fundstücke, Gesprächsstarter"},
    "Outdoorsy & functional":   { label: "Outdoor & funktional",     sub: "Praktische Ausrüstung für aktives Leben"   },
    "Maximalist & bold":        { label: "Maximalistisch & mutig",   sub: "Mehr Farbe, mehr Persönlichkeit"           },
  },
  es: {
    "Minimalist & clean":       { label: "Minimalista & limpio",     sub: "Menos es más — calidad sobre cantidad"     },
    "Classic & timeless":       { label: "Clásico & atemporal",      sub: "Elegante, bien hecho, nunca pasado"        },
    "Trendy & fashion-forward": { label: "Moderno & vanguardista",   sub: "Siempre con lo último"                     },
    "Quirky & unique":          { label: "Original & único",         sub: "Piezas inusuales que generan conversación" },
    "Outdoorsy & functional":   { label: "Outdoor & funcional",      sub: "Equipo práctico para vida activa"          },
    "Maximalist & bold":        { label: "Maximalista & atrevido",   sub: "Más color, más personalidad"               },
  },
  pt: {
    "Minimalist & clean":       { label: "Minimalista & limpo",      sub: "Menos é mais — qualidade sobre quantidade" },
    "Classic & timeless":       { label: "Clássico & atemporal",     sub: "Elegante, bem feito, nunca passado"        },
    "Trendy & fashion-forward": { label: "Trendy & vanguardista",    sub: "Sempre na última moda"                     },
    "Quirky & unique":          { label: "Original & único",         sub: "Peças incomuns que geram conversa"         },
    "Outdoorsy & functional":   { label: "Outdoor & funcional",      sub: "Equipamento prático para vida ativa"       },
    "Maximalist & bold":        { label: "Maximalista & ousado",     sub: "Mais cor, mais personalidade"              },
  },
};

export function tStyleDisplay(lang: LangCode, style: string): StyleDisplay {
  return STYLE_TRANSLATIONS[lang]?.[style] ?? { label: style, sub: "" };
}

/* ──────────────────── Avoid translations ──────────────────────── */

const AVOID_TRANSLATIONS: Record<LangCode, Record<string, string>> = {
  en: {
    "No alcohol / caffeine": "No alcohol / caffeine",
    "Vegan / eco-conscious": "Vegan / eco-conscious",
    "Prefer experiences over things": "Prefer experiences over things",
    "Small space — no clutter": "Small space — no clutter",
    "Already has too much stuff": "Already has too much stuff",
    "Don't want anything too personal": "Don't want anything too personal",
    "Avoid anything generic / gift-sethy": "Avoid anything generic / gift-sethy",
  },
  it: {
    "No alcohol / caffeine": "No alcol / caffeina",
    "Vegan / eco-conscious": "Vegano / eco-consapevole",
    "Prefer experiences over things": "Preferisce esperienze a oggetti",
    "Small space — no clutter": "Spazio ridotto — niente disordine",
    "Already has too much stuff": "Ha già troppe cose",
    "Don't want anything too personal": "Niente di troppo personale",
    "Avoid anything generic / gift-sethy": "Niente di generico / banale",
  },
  fr: {
    "No alcohol / caffeine": "Pas d'alcool / caféine",
    "Vegan / eco-conscious": "Végétalien / éco-responsable",
    "Prefer experiences over things": "Préfère les expériences aux objets",
    "Small space — no clutter": "Petit espace — pas d'encombrement",
    "Already has too much stuff": "A déjà trop d'affaires",
    "Don't want anything too personal": "Rien de trop personnel",
    "Avoid anything generic / gift-sethy": "Éviter le générique / banal",
  },
  de: {
    "No alcohol / caffeine": "Kein Alkohol / Koffein",
    "Vegan / eco-conscious": "Vegan / umweltbewusst",
    "Prefer experiences over things": "Lieber Erlebnisse als Dinge",
    "Small space — no clutter": "Kleiner Raum — kein Durcheinander",
    "Already has too much stuff": "Hat schon zu viel Zeug",
    "Don't want anything too personal": "Nichts zu Persönliches",
    "Avoid anything generic / gift-sethy": "Nichts Generisches / Klischeegeschenke",
  },
  es: {
    "No alcohol / caffeine": "Sin alcohol / cafeína",
    "Vegan / eco-conscious": "Vegano / eco-consciente",
    "Prefer experiences over things": "Prefiere experiencias a objetos",
    "Small space — no clutter": "Espacio reducido — sin desorden",
    "Already has too much stuff": "Ya tiene demasiadas cosas",
    "Don't want anything too personal": "Nada demasiado personal",
    "Avoid anything generic / gift-sethy": "Nada genérico / aburrido",
  },
  pt: {
    "No alcohol / caffeine": "Sem álcool / cafeína",
    "Vegan / eco-conscious": "Vegan / eco-consciente",
    "Prefer experiences over things": "Prefere experiências a objetos",
    "Small space — no clutter": "Espaço pequeno — sem desordem",
    "Already has too much stuff": "Já tem coisas a mais",
    "Don't want anything too personal": "Nada demasiado pessoal",
    "Avoid anything generic / gift-sethy": "Nada genérico / banal",
  },
};

export function tAvoid(lang: LangCode, avoid: string): string {
  return AVOID_TRANSLATIONS[lang]?.[avoid] ?? avoid;
}
