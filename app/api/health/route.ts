import { NextResponse } from "next/server";
import {
  fallbackProvider,
  llmConfigured,
  primaryProvider,
  probeLlm,
} from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnostics endpoint (temporary).
 * Returns booleans only for env presence — never key values — plus the
 * configured model names and a short live probe ("reply OK") when a key
 * is configured. Without a key it reports demo mode without calling any LLM.
 */
export async function GET() {
  const primary = primaryProvider();
  const fallback = fallbackProvider();
  const configured = llmConfigured();

  const env = {
    llmBaseUrl: Boolean(process.env.LLM_BASE_URL),
    llmApiKey: Boolean(process.env.LLM_API_KEY),
    llmModel: Boolean(process.env.LLM_MODEL),
    llmFallbackBaseUrl: Boolean(process.env.LLM_FALLBACK_BASE_URL),
    llmFallbackApiKey: Boolean(process.env.LLM_FALLBACK_API_KEY),
    llmFallbackModel: Boolean(process.env.LLM_FALLBACK_MODEL),
  };

  if (!configured) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      env,
      model: primary.model,
      fallbackModel: fallback.model,
      test: null,
    });
  }

  try {
    const probe = await probeLlm();
    return NextResponse.json({
      ok: true,
      mode: "live",
      env,
      model: primary.model,
      fallbackModel: fallback.model,
      test: { ok: probe.reply === "OK", reply: probe.reply, provider: probe.provider, ms: probe.ms },
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      mode: "live",
      env,
      model: primary.model,
      fallbackModel: fallback.model,
      test: { ok: false, error: (e as Error)?.message ?? "LLM probe failed" },
    });
  }
}
