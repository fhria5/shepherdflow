import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CareOutputSchema,
  GenerateOutputSchema,
  SermonOutputSchema,
  type Audience,
  type Congregant,
  type GenerateRequest,
  type GenerateResult,
  type OutputLang,
} from "@/lib/types";
import { OUTPUT_LANGUAGES, countUnits, isCharCountLang, maxUnits, minUnits } from "@/lib/languages";
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
  tradition: z.enum(["Protestant", "Catholic", "Orthodox", "Pentecostal/Charismatic", "Evangelical", "Anglican/Lutheran", "Other"]),
  tone: z.enum(["formal", "warm", "simple"]),
  outputLang: z.enum(["en", "es", "pt", "fr", "ko", "id", "sw", "tl", "it", "ru", "ja", "zh"]),
  audience: z.enum(["adults", "teens", "children"]).optional().default("adults"),
  congregants: z.array(
    z.object({
      id: z.string(),
      initials: z.string().min(1).max(6),
      category: z.enum(["new", "absent", "sick", "grieving", "birthday", "other"]),
      note: z.string().max(300),
    })
  ).max(30),
});

function audienceInstruction(audience: Audience): string {
  if (audience === "teens")
    return "AUDIENCE — teenagers (ages 13-17): use plain everyday words, short sentences, and relatable situations from school, home, friends, and phones. Do not use childish language.";
  if (audience === "children")
    return "AUDIENCE — children (ages 6-11): use very simple words, short sentences, and concrete examples from family, school, friends, and helping at home. Ask questions a child can answer from their own day.";
  return "AUDIENCE — adults: use natural vocabulary and full sentences.";
}

function langName(lang: OutputLang): string {
  return OUTPUT_LANGUAGES[lang].name;
}

function sermonSystemPrompt(req: GenerateRequest): string {
  const lang = langName(req.outputLang);
  const info = OUTPUT_LANGUAGES[req.outputLang];
  const quoteRule = isCharCountLang(req.outputLang)
    ? "4. Every summary point and every discussion question MUST include a 'quote': a short passage copied VERBATIM from the transcript, at most about 100 characters."
    : "4. Every summary point and every discussion question MUST include a 'quote': a short passage copied VERBATIM from the transcript, at most 25 words.";
  return [
    "You are ShepherdFlow, a sermon follow-up assistant for small churches.",
    "RULES — follow them strictly:",
    "1. Use ONLY the sermon transcript provided. Do not add new teaching, interpretation, or Bible verses. Do not quote any verse that is not in the transcript. Do not invent stories and present them as part of the sermon.",
    `2. Follow the ${req.tradition} tradition and a ${req.tone} tone. Do not judge other traditions.`,
    "3. Never give medical, legal, or psychological advice.",
    quoteRule,
    `5. Write ALL output text in ${lang}.`,
    audienceInstruction(req.audience),
    ...(info.beta
      ? ["7. This language is in beta: write simply and clearly, so a native speaker can review it easily."]
      : []),
    "8. Respond with JSON ONLY, matching this shape exactly:",
    '{"summary":[{"text":"...","quote":"..."}], "questions":[{"text":"...","quote":"..."}], "devotions":[{"day":"Monday","text":"...","prayer":"..."}]}',
    `summary: 3-4 points. questions: exactly 5. devotions: exactly 5, days ${info.days.join(", ")}, written in the output language.`,
  ].join("\n");
}

function careSystemPrompt(req: GenerateRequest): string {
  const lang = langName(req.outputLang);
  const info = OUTPUT_LANGUAGES[req.outputLang];
  return [
    "You are ShepherdFlow, a sermon follow-up assistant for small churches.",
    "RULES — follow them strictly:",
    "1. Use ONLY the sermon transcript provided for themes. Do not add new teaching, interpretation, or Bible verses.",
    "2. Do not invent facts about any congregant. Drafts may only use what is in their category and note. Address a person by their initials only; never invent a name or a placeholder name.",
    "3. For care triage, suggest action 'message' or 'visit' and a short pastor suggestion. For people who are sick or grieving, or whose note mentions crisis, choose 'visit' and do NOT write a draft.",
    `4. Write ALL output text in ${lang}.`,
    audienceInstruction(req.audience),
    ...(info.beta
      ? ["6. This language is in beta: write simply and clearly, so a native speaker can review it easily."]
      : []),
    "7. Respond with JSON ONLY, matching this shape exactly:",
    '{"care":[{"initials":"AK","action":"message","suggestion":"...","draft":"..."}]}',
    "care: one entry per congregant listed, in the same order.",
  ].join("\n");
}

function userText(req: GenerateRequest): string {
  return [
    `Tradition: ${req.tradition}`,
    `Tone: ${req.tone}`,
    `Output language: ${langName(req.outputLang)}`,
    `Audience: ${req.audience}`,
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

function truncateQuote(quote: string, lang: OutputLang, maxWords = 25): string {
  const q = quote.trim();
  // Spaceless scripts (Japanese, Chinese): cap by characters instead.
  if (!q.includes(" ")) {
    return q.length <= 120 ? q : q.slice(0, 120);
  }
  const words = q.split(/\s+/);
  if (words.length <= maxWords) return q;
  return words.slice(0, maxWords).join(" ");
}

function postProcess(
  req: GenerateRequest,
  parsed: z.infer<typeof GenerateOutputSchema>
): GenerateResult {
  const transcript = req.transcript;

  const summary = parsed.summary.map((s) => {
    const q = truncateQuote(s.quote, req.outputLang);
    const verified = quoteExistsInTranscript(q, transcript);
    return { text: s.text, quote: q, quoteVerified: verified };
  });
  const questions = parsed.questions.map((q) => {
    const quote = truncateQuote(q.quote, req.outputLang);
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
    outputLang: req.outputLang,
    audience: req.audience,
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
  const units = countUnits(req.transcript, req.outputLang);
  const isChars = isCharCountLang(req.outputLang);
  if (units === 0) {
    return NextResponse.json({ error: "empty", message: "Please paste a sermon transcript first." }, { status: 400 });
  }
  if (units < minUnits()) {
    return NextResponse.json({ error: "too_short", message: isChars ? "The transcript is too short. Please add more of the sermon (at least 30 characters)." : "The transcript is too short. Please add more of the sermon (at least 30 words)." }, { status: 400 });
  }
  if (units > maxUnits(req.outputLang)) {
    return NextResponse.json({ error: "too_long", message: isChars ? "The transcript is too long. The limit is 20,000 characters." : "The transcript is too long. The limit is 8,000 words." }, { status: 400 });
  }
  // DEMO MODE — no live AI key configured.
  if (!llmConfigured()) {
    const demo = generateDemoResult(req.transcript, req.tone, req.outputLang, req.audience, req.congregants);
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
    const care = await (async () => {
      // Small gap between the two calls: the Verboo router rejects
      // bursts, so do not start the care call the instant the sermon
      // call returns.
      await new Promise((r) => setTimeout(r, 3000));
      return callLlmJson(
      [
        { role: "system", content: careSystemPrompt(req) },
        { role: "user", content: text },
      ] as LlmMessage[],
      (raw) => CareOutputSchema.parse(raw),
      "care"
    );
    })();
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
