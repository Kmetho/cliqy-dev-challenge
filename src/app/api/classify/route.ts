import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ClassifyRequest, ClassifyResponse } from "@/types";

// Model i limit tokenów są zablokowane — nie zmieniaj tych stałych.
const MODEL = "gpt-4o-mini" as const;
const MAX_TOKENS = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  req: Request,
): Promise<NextResponse<ClassifyResponse | { error: string }>> {
  const body: ClassifyRequest = await req.json();
  if (!body.message?.trim() || !body.company?.trim()) {
    return NextResponse.json(
      { error: "Message and company are required." },
      { status: 400 },
    );
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Jesteś asystentem AI klasyfikującym wiadomości klientów dla firmy. Odpowiadaj WYŁĄCZNIE poprawnym JSON-em o następującej strukturze:
{
  "category": "zamówienie" | "pytanie" | "reklamacja" | "spam",
  "priority": "high" | "medium" | "low",
  "draft_reply": "gotowy szkic odpowiedzi po polsku, w tonie profesjonalnym i przyjaznym, dopasowanym do firmy i kategorii wiadomości",
  "confidence": 0.0-1.0
}

Zasady priorytetów:
- "high": pilne sprawy - wszystko wymagające szybkiej reakcji, duże zamówienia;
- "medium": standardowe maila od klientów, które nie są pilne, ale wymagają odpowiedzi;
- "low": proste pytania, spam;

draft_reply musi być gotową odpowiedzią w języku polskim, dopasowaną tonem do firmy i typu wiadomości.`,
      },
      {
        role: "user",
        content: `Firma: ${body.company}\n\nWiadomość klienta:\n${body.message}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  const parsed = JSON.parse(raw) as ClassifyResponse;

  const validCategories = [
    "zamówienie",
    "pytanie",
    "reklamacja",
    "spam",
  ] as const;

  const validPriorities = ["high", "medium", "low"] as const;

  const result: ClassifyResponse = {
    category: validCategories.includes(
      parsed.category as (typeof validCategories)[number],
    )
      ? parsed.category
      : "pytanie",

    priority: validPriorities.includes(
      parsed.priority as (typeof validPriorities)[number],
    )
      ? parsed.priority
      : "medium",

    draft_reply:
      parsed.draft_reply ||
      "Dziękujemy za wiadomość. Wkrótce się z Państwem skontaktujemy.",

    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
  };

  return NextResponse.json(result);
}
