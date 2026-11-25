import type { Category, Congregant } from "./types";

/**
 * HARD CARE-TRIAGE RULES — implemented in code, not only in the prompt.
 *
 * A congregant MUST be routed to "Contact / visit in person" (and must NOT
 * receive an AI message draft) when ANY of these is true:
 *   1. category is "sick" or "grieving"
 *   2. the note contains a crisis keyword (English or Indonesian)
 *
 * This function is the single source of truth, used by the API route and by
 * the demo-mode generator. The LLM output is always overridden by it.
 */

export const CRISIS_KEYWORDS: string[] = [
  // English
  "suicide",
  "kill myself",
  "kill himself",
  "kill herself",
  "kill themself",
  "end my life",
  "end his life",
  "end her life",
  "self-harm",
  "self harm",
  "hurt myself",
  "hurt himself",
  "hurt herself",
  "harm myself",
  "harm himself",
  "harm herself",
  "severe depression",
  "domestic violence",
  "violence at home",
  // Indonesian
  "bunuh diri",
  "ingin mati",
  "akhiri hidup",
  "mengakhiri hidup",
  "menyakiti diri",
  "melukai diri",
  "menyakiti dirinya",
  "melukai dirinya",
  "depresi berat",
  "kekerasan",
  "kekerasan dalam rumah tangga",
  "kdrt",
];

export function noteHasCrisisKeyword(note: string): boolean {
  const hay = ` ${note.toLowerCase()} `;
  return CRISIS_KEYWORDS.some((kw) => hay.includes(kw.toLowerCase()));
}

/** Categories that always require in-person contact, no AI draft. */
export const VISIT_ONLY_CATEGORIES: Category[] = ["sick", "grieving"];

export interface TriageDecision {
  action: "message" | "visit";
  crisis: boolean;
  reason: "category" | "crisis" | "none";
}

/** Pure, deterministic triage decision for one congregant. */
export function triageCongregant(person: Congregant): TriageDecision {
  const crisis = noteHasCrisisKeyword(person.note || "");
  if (crisis) return { action: "visit", crisis: true, reason: "crisis" };
  if (VISIT_ONLY_CATEGORIES.includes(person.category)) {
    return { action: "visit", crisis: false, reason: "category" };
  }
  return { action: "message", crisis: false, reason: "none" };
}

/**
 * Enforce the hard rules on an AI-produced care list: force "visit" and drop
 * any draft for people the rules route to in-person contact.
 */
export function enforceTriage(
  people: Congregant[],
  aiCare: { initials: string; action: "message" | "visit"; suggestion: string; draft?: string }[]
): { initials: string; action: "message" | "visit"; suggestion: string; draft?: string; crisis: boolean }[] {
  const byInitials = new Map(aiCare.map((c) => [c.initials.trim().toUpperCase(), c]));
  return people.map((p) => {
    const decision = triageCongregant(p);
    const ai = byInitials.get(p.initials.trim().toUpperCase());
    if (decision.action === "visit") {
      return {
        initials: p.initials,
        action: "visit" as const,
        // Never trust an AI suggestion for a visit case blindly; keep a safe,
        // human-centred default unless the AI gave one.
        suggestion:
          ai?.suggestion && ai.suggestion.trim().length > 0
            ? ai.suggestion
            : decision.crisis
              ? "Contact today. Listen first, do not counsel alone — involve the pastor and, if needed, a professional."
              : "Call today, listen first, and offer a visit this week.",
        draft: undefined, // HARD RULE: no AI draft for visit cases.
        crisis: decision.crisis,
      };
    }
    return {
      initials: p.initials,
      action: "message" as const,
      suggestion: ai?.suggestion || "Send a warm, short personal message this week.",
      draft: ai?.draft,
      crisis: false,
    };
  });
}
