import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { AdaptiveQuestionRequest, AdaptiveQuestionResult } from "@/lib/types";
import { QUESTION_LIBRARY } from "@/lib/questionLibrary";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/^﻿/, "") });

const CHOOSE_QUESTION_TOOL: Anthropic.Messages.ToolUnion = {
  name: "choose_question",
  description:
    "Extract signals from the user's free-text observation and pick exactly one question from the library that would most reduce uncertainty about the gift.",
  input_schema: {
    type: "object",
    properties: {
      signals: {
        type: "array",
        description: "Key facts extracted from the observation, e.g. {key:'ceramica', value:'fa ceramica da qualche mese'}",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            value: { type: "string" },
          },
          required: ["key", "value"],
        },
      },
      incertezza_principale: {
        type: "string",
        description: "One short sentence: the single biggest open question about this recipient's gift.",
      },
      domanda_id: {
        type: "string",
        enum: QUESTION_LIBRARY.map((q) => q.id),
        description: "The id of the library question that best resolves incertezza_principale.",
      },
      ready_to_recommend: {
        type: "boolean",
        description: "True only when the available information is already specific enough to recommend highly relevant gifts without another clarification.",
      },
    },
    required: ["signals", "incertezza_principale", "domanda_id", "ready_to_recommend"],
  },
};

function buildSystemPrompt(): string {
  const libraryList = QUESTION_LIBRARY.map((q) => `- ${q.id}: "${q.question}" (risolve: ${q.resolves})`).join("\n");
  return `Sei un esperto di gift recommendation. Analizza le informazioni fornite sull'utente e:
1. Estrai i segnali chiave (interessi, comportamenti, preferenze, vincoli) dall'osservazione libera.
2. Identifica l'incertezza principale che, se risolta, aiuterebbe a consigliare meglio.
3. Decidi se le informazioni sono già abbastanza specifiche per consigliare regali davvero pertinenti.
4. Se manca ancora qualcosa, scegli UNA domanda tra quelle della libreria che riduce di più questa incertezza.

Considera sufficienti le informazioni solo quando emergono almeno un interesse o comportamento concreto e una preferenza utile sul tipo di regalo, sul modo in cui verrebbe usato, su ciò che possiede già o su ciò che evita. Non dichiarare mai sufficienti le sole informazioni su occasione e budget.

Libreria domande disponibili:
${libraryList}

Chiama sempre choose_question. Non inventare domande fuori dalla libreria.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: AdaptiveQuestionRequest = await req.json();
    const { recipient, observation, previousQuestion, previousAnswer, conversation = [], questionCount = 0 } = body;

    const userParts = [
      `Rapporto: ${recipient.relation || "non specificato"}`,
      `Occasione: ${recipient.occasion || "non specificata"}`,
      `Budget: ${recipient.budgetMin}-${recipient.budgetMax}`,
      `Interessi: ${recipient.interests || "non specificati"}`,
      `Osservazione libera: ${observation}`,
    ];
    if (previousQuestion && previousAnswer) {
      userParts.push(`Domanda precedente: "${previousQuestion}" → risposta: "${previousAnswer}"`);
    }
    if (conversation.length) {
      userParts.push(`Conversazione completa:\n${conversation.map(message => `${message.role === "user" ? "Utente" : "Gifty"}: ${message.content}`).join("\n")}`);
    }
    userParts.push(`Domande di chiarimento già fatte: ${questionCount}.`);

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: buildSystemPrompt(),
      tools: [CHOOSE_QUESTION_TOOL],
      tool_choice: { type: "tool", name: "choose_question" },
      messages: [{ role: "user", content: userParts.join("\n") }],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "choose_question"
    );
    if (!toolUse) {
      return NextResponse.json({ error: "No question chosen" }, { status: 502 });
    }

    const input = toolUse.input as { signals: { key: string; value: string }[]; incertezza_principale: string; domanda_id: string; ready_to_recommend: boolean };
    const entry = QUESTION_LIBRARY.find((q) => q.id === input.domanda_id) ?? QUESTION_LIBRARY[0];
    const interestLabel = recipient.interests?.split(",")[0]?.trim() || "questo interesse";

    const result: AdaptiveQuestionResult = {
      signals: input.signals,
      incertezza_principale: input.incertezza_principale,
      domanda_scelta: entry.question.replace("{interest}", interestLabel),
      opzioni: entry.options,
      ready_to_recommend: questionCount > 0 && (input.ready_to_recommend || questionCount >= 3),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/adaptive-question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
