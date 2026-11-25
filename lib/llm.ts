/**
 * Server-side LLM client for ShepherdFlow.
 *
 * - Reads LLM_BASE_URL / LLM_API_KEY / LLM_MODEL from env (server only).
 * - Optional fallback: LLM_FALLBACK_BASE_URL / LLM_FALLBACK_API_KEY /
 *   LLM_FALLBACK_MODEL. When a fallback env var is missing it defaults to
 *   the matching primary value, so the fallback provider is the primary
 *   provider unless the user configures a different one.
 * - Demo mode is decided by the caller: no key => no call at all.
 * - A failed key-present call NEVER falls back to demo output; it throws.
 * - Logging is status + duration only. Transcripts and congregant data are
 *   never logged.
 */

export interface LlmProvider {
  label: "primary" | "fallback";
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmMessage {
  role: "system" | "user";
  content: string;
}

const CALL_TIMEOUT_MS = 45_000;

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

export function primaryProvider(): LlmProvider {
  return {
    label: "primary",
    baseUrl: (process.env.LLM_BASE_URL || "https://code.verboo.ai/router/v1").replace(/\/$/, ""),
    apiKey: process.env.LLM_API_KEY || "",
    model: process.env.LLM_MODEL || "glm-5.3-flash",
  };
}

export function fallbackProvider(): LlmProvider {
  const primary = primaryProvider();
  return {
    label: "fallback",
    baseUrl: (process.env.LLM_FALLBACK_BASE_URL || primary.baseUrl).replace(/\/$/, ""),
    apiKey: process.env.LLM_FALLBACK_API_KEY || primary.apiKey,
    model: process.env.LLM_FALLBACK_MODEL || primary.model,
  };
}

function sameProvider(a: LlmProvider, b: LlmProvider): boolean {
  return a.baseUrl === b.baseUrl && a.apiKey === b.apiKey && a.model === b.model;
}

export class LlmError extends Error {
  status?: number;
  provider: string;
  constructor(message: string, provider: string, status?: number) {
    super(message);
    this.provider = provider;
    this.status = status;
  }
}

/** Strip ```json fences and any text outside the outer JSON object. */
export function extractJson(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  return t.trim();
}

async function postChat(
  provider: LlmProvider,
  messages: LlmMessage[],
  useJsonFormat: boolean
): Promise<string> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: 0.3,
    };
    if (useJsonFormat) body.response_format = { type: "json_object" };
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      cache: "no-store", // never serve a stale cached LLM reply (esp. /api/health probe)
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`[llm] ${provider.label} ${res.status} ${ms}ms`);
      throw new LlmError(
        `LLM request failed (${res.status})`,
        provider.label,
        res.status
      );
    }
    const data = await res.json().catch(() => null);
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    console.log(`[llm] ${provider.label} ok ${ms}ms`);
    if (!content) throw new LlmError("Empty response from AI service", provider.label);
    return content;
  } catch (e) {
    if (e instanceof LlmError) throw e;
    const ms = Date.now() - started;
    const aborted =
      (e as Error)?.name === "AbortError" || (e as Error)?.name === "TimeoutError";
    console.log(`[llm] ${provider.label} ${aborted ? "timeout" : "error"} ${ms}ms`);
    throw new LlmError(
      aborted ? "AI service timed out" : "AI service could not be reached",
      provider.label
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One JSON call against one provider, with structured-output handling:
 * Verboo's router rejects response_format=json_object with 403
 * (structured_output_not_enabled) AND counts those failed calls toward
 * its burst/rate limit, so for Verboo we go plain-text first and parse
 * the JSON out of the reply. Other providers still try json_object
 * first and fall back to plain text on 403.
 * On parse failure the caller retries with a "valid JSON only" instruction.
 */
async function callJsonOnce<T>(
  provider: LlmProvider,
  messages: LlmMessage[],
  parse: (raw: unknown) => T,
  strictJsonInstruction: boolean
): Promise<T> {
  const msgs = strictJsonInstruction
    ? [...messages, { role: "user", content: "Return only valid JSON, no other text." } as LlmMessage]
    : messages;
  const skipJsonFormat = provider.baseUrl.includes("verboo");
  let content: string;
  if (skipJsonFormat) {
    content = await postChat(provider, msgs, false);
  } else {
    try {
      content = await postChat(provider, msgs, true);
    } catch (e) {
      if (e instanceof LlmError && e.status === 403) {
        // Provider does not support response_format — retry as plain text.
        content = await postChat(provider, msgs, false);
      } else {
        throw e;
      }
    }
  }
  let raw: unknown;
  try {
    raw = JSON.parse(extractJson(content));
  } catch {
    throw new LlmError("AI output was not valid JSON", provider.label);
  }
  try {
    return parse(raw);
  } catch {
    throw new LlmError("AI output did not match the expected format", provider.label);
  }
}

/**
 * Run a JSON task against the primary provider (one retry on parse/format
 * failure), then the fallback provider on any failure. Throws LlmError if
 * both providers fail; never returns demo data.
 */
export async function callLlmJson<T>(
  messages: LlmMessage[],
  parse: (raw: unknown) => T,
  taskLabel: string
): Promise<T> {
  const primary = primaryProvider();
  const fallback = fallbackProvider();
  const providers: LlmProvider[] = sameProvider(primary, fallback)
    ? [primary]
    : [primary, fallback];
  let lastError: unknown = null;
  for (const provider of providers) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) {
        // Longer backoff: the Verboo router rejects bursts with 503/429,
        // so give the rate-limit window time to clear before retrying.
        await new Promise((r) => setTimeout(r, 5000));
      }
      try {
        const out = await callJsonOnce(provider, messages, parse, attempt === 1);
        console.log(`[llm] ${taskLabel} ok via ${provider.label} attempt ${attempt + 1}`);
        return out;
      } catch (e) {
        lastError = e;
        console.log(
          `[llm] ${taskLabel} failed via ${provider.label} attempt ${attempt + 1}: ${(e as Error)?.message ?? "unknown"}`
        );
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new LlmError("AI service could not be reached", "primary");
}

/** Short connectivity probe used by /api/health. Returns the raw reply. */
export async function probeLlm(): Promise<{ provider: string; reply: string; ms: number }> {
  const primary = primaryProvider();
  const fallback = fallbackProvider();
  const providers: LlmProvider[] = sameProvider(primary, fallback)
    ? [primary]
    : [primary, fallback];
  let lastError: unknown = null;
  for (const provider of providers) {
    const started = Date.now();
    try {
      const content = await postChat(
        provider,
        [{ role: "user", content: "Reply with exactly: OK" }],
        false
      );
      return { provider: provider.label, reply: content.trim(), ms: Date.now() - started };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new LlmError("AI service could not be reached", "primary");
}
