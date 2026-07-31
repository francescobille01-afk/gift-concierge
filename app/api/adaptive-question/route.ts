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
    },
    required: ["signals", "incertezza_principale", "domanda_id"],
  },
};

function buildSystemPrompt(): string {
  const libraryList = QUESTION_LIBRARY.map((q) => `- ${q.id}: "${q.question}" (risolve: ${q.resolves})`).join("\n");
  return `Sei un esperto di gift recommendation. Analizza le informazioni fornite sull'utente e:
1. Estrai i segnali chiave (interessi, comportamenti, preferenze, vincoli) dall'osservazione libera.
2. Identifica l'incertezza principale che, se risolta, aiuterebbe a consigliare meglio.
3. Scegli UNA domanda tra quelle della libreria che riduce di più questa incertezza.

Libreria domande disponibili:
${libraryList}

Chiama sempre choose_question. Non inventare domande fuori dalla libreria.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: AdaptiveQuestionRequest = await req.json();
    const { recipient, observation, previousQuestion, previousAnswer } = body;

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

    const input = toolUse.input as { signals: { key: string; value: string }[]; incertezza_principale: string; domanda_id: string };
    const entry = QUESTION_LIBRARY.find((q) => q.id === input.domanda_id) ?? QUESTION_LIBRARY[0];
    const interestLabel = recipient.interests?.split(",")[0]?.trim() || "questo interesse";

    const result: AdaptiveQuestionResult = {
      signals: input.signals,
      incertezza_principale: input.incertezza_principale,
      domanda_scelta: entry.question.replace("{interest}", interestLabel),
      opzioni: entry.options,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("/api/adaptive-question error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
