import { NextResponse } from "next/server";
import { callLlmJson, LlmError, type LlmMessage } from "@/lib/llm";
import { SermonOutputSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** TEMPORARY diagnostics: one sermon-style call, returns the raw error. */
export async function GET() {
  const started = Date.now();
  try {
    const out = await callLlmJson(
      [
        {
          role: "system",
          content:
            "You are ShepherdFlow. Respond with JSON ONLY: {\"summary\":[{\"text\":\"...\",\"quote\":\"...\"}], \"questions\":[{\"text\":\"...\",\"quote\":\"...\"}], \"devotions\":[{\"day\":\"Monday\",\"text\":\"...\",\"prayer\":\"...\"}]}. summary: 3-4 points. questions: exactly 5. devotions: exactly 5.",
        },
        {
          role: "user",
          content:
            "SERMON TRANSCRIPT: Love that serves. Jesus said in John 13:34-35, love one another as I have loved you. He washed feet. In Mark 10:45 He did not come to be served, but to serve. Serve one another humbly in love, Galatians 5:13.",
        },
      ] as LlmMessage[],
      (raw) => SermonOutputSchema.parse(raw),
      "debug-sermon"
    );
    return NextResponse.json({
      ok: true,
      ms: Date.now() - started,
      summary: out.summary.length,
      questions: out.questions.length,
      devotions: out.devotions.length,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      ms: Date.now() - started,
      error: (e as Error)?.message ?? "unknown",
      status: e instanceof LlmError ? e.status : undefined,
      provider: e instanceof LlmError ? e.provider : undefined,
    });
  }
}
