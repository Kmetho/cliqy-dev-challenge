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

  try {
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
  } catch {
    return NextResponse.json(classifyFallback(body.message, body.company));
  }
}

function classifyFallback(message: string, company: string): ClassifyResponse {
  const lower = message.toLowerCase();

  const spamKeywords = ["wygraj", "kliknij", "promocja", "za darmo", "viagra", "lottery"];
  const orderKeywords = ["zamówi", "zamawiam", "kupię", "kupić", "chciałbym zamówić", "sztuk", "ile kosztuje"];
  const complaintKeywords = ["reklamacj", "zwrot", "uszkodzon", "zepsut", "nie działa", "do niczego", "skandal", "paczka nie", "nie dotarł"];
  const questionKeywords = ["godziny", "kiedy", "gdzie", "jak", "czy", "ile", "jaki", "która", "pytanie"];

  let category: ClassifyResponse["category"] = "pytanie";
  let priority: ClassifyResponse["priority"] = "medium";
  let confidence = 0.75;

  if (spamKeywords.some((k) => lower.includes(k))) {
    category = "spam";
    priority = "low";
    confidence = 0.85;
  } else if (complaintKeywords.some((k) => lower.includes(k))) {
    category = "reklamacja";
    priority = "high";
    confidence = 0.82;
  } else if (orderKeywords.some((k) => lower.includes(k))) {
    category = "zamówienie";
    priority = "high";
    confidence = 0.88;
  } else if (questionKeywords.some((k) => lower.includes(k))) {
    category = "pytanie";
    priority = "low";
    confidence = 0.8;
  }

  const drafts: Record<ClassifyResponse["category"], string> = {
    zamówienie: `Dzień dobry! Dziękujemy za zainteresowanie ofertą ${company}. Chętnie pomożemy z realizacją zamówienia — prosimy o szczegóły, a przygotujemy wycenę.`,
    pytanie: `Dzień dobry! Dziękujemy za kontakt z ${company}. Z przyjemnością odpowiemy na Państwa pytanie — prosimy o chwilę cierpliwości.`,
    reklamacja: `Dzień dobry, przepraszamy za niedogodności. Zespół ${company} traktuje takie zgłoszenia priorytetowo. Prosimy o numer zamówienia, abyśmy mogli niezwłocznie rozpatrzyć sprawę.`,
    spam: `Dziękujemy za wiadomość. Nie jesteśmy w stanie na nią odpowiedzieć.`,
  };

  return {
    category,
    priority,
    draft_reply: drafts[category],
    confidence,
  };
}
