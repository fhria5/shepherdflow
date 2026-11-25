import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CareOutputSchema,
  GenerateOutputSchema,
  SermonOutputSchema,
  type Congregant,
  type GenerateRequest,
  type GenerateResult,
} from "@/lib/types";
import { generateDemoResult } from "@/lib/sample";
import { enforceTriage } from "@/lib/triage";
import {
  extractVerses,
  flagVersesNotInTranscript,
  quoteExistsInTranscript,
} from "@/lib/validate";
import { callLlmJson, llmConfigured, LlmError, type LlmMessage } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RequestSchema = z.object({
  transcript: z.string(),
  tradition: z.enum(["Protestant", "Catholic", "Pentecostal/Charismatic", "Other"]),
  tone: z.enum(["formal", "warm", "simple"]),
  outputLang: z.enum(["en", "id"]),
  congregants: z.array(
    z.object({
      id: z.string(),
      initials: z.string().min(1).max(6),
      category: z.enum(["new", "absent", "sick", "grieving", "birthday", "other"]),
      note: z.string().max(300),
    })
  ).max(30),
});

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function sermonSystemPrompt(req: GenerateRequest): string {
  const lang = req.outputLang === "id" ? "Bahasa Indonesia" : "English";
  return [
    "You are ShepherdFlow, a sermon follow-up assistant for small churches.",
    "RULES — follow them strictly:",
    "1. Use ONLY the sermon transcript provided. Do not add new teaching, interpretation, or Bible verses. Do not quote any verse that is not in the transcript.",
    `2. Follow the ${req.tradition} tradition and a ${req.tone} tone. Do not judge other traditions.`,
    "3. Never give medical, legal, or psychological advice.",
    "4. Every summary point and every discussion question MUST include a 'quote': a short passage copied VERBATIM from the transcript, at most 25 words.",
    `5. Write ALL output text in ${lang}.`,
    "6. Respond with JSON ONLY, matching this shape exactly:",
    '{"summary":[{"text":"...","quote":"..."}], "questions":[{"text":"...","quote":"..."}], "devotions":[{"day":"Monday","text":"...","prayer":"..."}]}',
    "summary: 3-4 points. questions: exactly 5. devotions: exactly 5, days Monday to Friday, written in the output language (e.g. Senin–Jumat for Bahasa Indonesia).",
  ].join("\n");
}

function careSystemPrompt(req: GenerateRequest): string {
  const lang = req.outputLang === "id" ? "Bahasa Indonesia" : "English";
  return [
    "You are ShepherdFlow, a sermon follow-up assistant for small churches.",
    "RULES — follow them strictly:",
    "1. Use ONLY the sermon transcript provided for themes. Do not add new teaching, interpretation, or Bible verses.",
    "2. Do not invent facts about any congregant. Drafts may only use what is in their category and note. Address a person by their initials only; never invent a name or a placeholder name.",
    "3. For care triage, suggest action 'message' or 'visit' and a short pastor suggestion. For people who are sick or grieving, or whose note mentions crisis, choose 'visit' and do NOT write a draft.",
    `4. Write ALL output text in ${lang}.`,
    "5. Respond with JSON ONLY, matching this shape exactly:",
    '{"care":[{"initials":"AK","action":"message","suggestion":"...","draft":"..."}]}',
    "care: one entry per congregant listed, in the same order.",
  ].join("\n");
}

function userText(req: GenerateRequest): string {
  return [
    `Tradition: ${req.tradition}`,
    `Tone: ${req.tone}`,
    `Output language: ${req.outputLang === "id" ? "Bahasa Indonesia" : "English"}`,
    "",
    "SERMON TRANSCRIPT:",
    req.transcript,
    "",
    "CONGREGANTS (initials only):",
    ...req.congregants.map(
      (c: Congregant) => `- ${c.initials} | category: ${c.category} | note: ${c.note || "(none)"}`
    ),
  ].join("\n");
}

function truncateQuote(quote: string, maxWords = 25): string {
  const words = quote.trim().split(/\s+/);
  if (words.length <= maxWords) return quote.trim();
  return words.slice(0, maxWords).join(" ");
}

function postProcess(
  req: GenerateRequest,
  parsed: z.infer<typeof GenerateOutputSchema>
): GenerateResult {
  const transcript = req.transcript;

  const summary = parsed.summary.map((s) => {
    const q = truncateQuote(s.quote);
    const verified = quoteExistsInTranscript(q, transcript);
    return { text: s.text, quote: q, quoteVerified: verified };
  });
  const questions = parsed.questions.map((q) => {
    const quote = truncateQuote(q.quote);
    return { text: q.text, quote, quoteVerified: quoteExistsInTranscript(quote, transcript) };
  });

  const outputText = [
    ...summary.map((s) => s.text),
    ...questions.map((q) => q.text),
    ...parsed.devotions.map((d) => `${d.text} ${d.prayer}`),
    ...parsed.care.map((c) => `${c.suggestion} ${c.draft || ""}`),
  ].join("\n");
  const versesFlagged = flagVersesNotInTranscript(outputText, transcript);
  const versesInTranscript = extractVerses(transcript);

  // HARD RULES: enforce triage in code — overrides whatever the AI returned.
  const enforced = enforceTriage(req.congregants, parsed.care);
  const care = enforced.map((c, i) => {
    const person = req.congregants[i];
    return {
      ...c,
      category: person.category,
      note: person.note,
      crisis: c.crisis,
      draftApproved: false,
      draftEdited: false,
    };
  });

  return {
    summary,
    questions,
    devotions: parsed.devotions,
    care,
    versesInTranscript,
    versesFlagged,
    demoMode: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsedReq = RequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json({ error: "Invalid request. Please check your input and try again." }, { status: 400 });
  }
  const req = parsedReq.data as GenerateRequest;
  const words = countWords(req.transcript);
  if (words === 0) {
    return NextResponse.json({ error: "empty", message: "Please paste a sermon transcript first." }, { status: 400 });
  }
  if (words < 30) {
    return NextResponse.json({ error: "too_short", message: "The transcript is too short. Please add more of the sermon (at least 30 words)." }, { status: 400 });
  }
  if (words > 8000) {
    return NextResponse.json({ error: "too_long", message: "The transcript is too long. The limit is 8,000 words." }, { status: 400 });
  }
  // DEMO MODE — no live AI key configured.
  if (!llmConfigured()) {
    const demo = generateDemoResult(req.transcript, req.tone, req.outputLang, req.congregants);
    return NextResponse.json({ result: demo });
  }

  // Live AI: two calls (sermon + care), each with its own retry +
  // provider fallback inside callLlmJson. They run SEQUENTIALLY, not in
  // parallel: the Verboo router rejects bursts of concurrent requests
  // with 503 while single calls succeed, so parallel calls are not
  // reliable on this provider. A failure here is a real error — never
  // silently fall back to demo results.
  const text = userText(req);
  try {
    const sermon = await callLlmJson(
      [
        { role: "system", content: sermonSystemPrompt(req) },
        { role: "user", content: text },
      ] as LlmMessage[],
      (raw) => SermonOutputSchema.parse(raw),
      "sermon"
    );
    const care = await callLlmJson(
      [
        { role: "system", content: careSystemPrompt(req) },
        { role: "user", content: text },
      ] as LlmMessage[],
      (raw) => CareOutputSchema.parse(raw),
      "care"
    );
    const merged = GenerateOutputSchema.parse({ ...sermon, ...care });
    const result = postProcess(req, merged);
    return NextResponse.json({ result });
  } catch (e) {
    const status = e instanceof LlmError ? e.status : undefined;
    if (status === 429) {
      return NextResponse.json({ error: "rate_limited", message: "The AI service is rate-limited right now. Please wait a moment and try again." }, { status: 429 });
    }
    return NextResponse.json(
      { error: "api_failed", message: "The AI service could not be reached. Please check your connection and try again." },
      { status: 502 }
    );
  }
}
