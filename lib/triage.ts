import type { Category, Congregant } from "./types";

/**
 * HARD CARE-TRIAGE RULES — implemented in code, not only in the prompt.
 *
 * A congregant MUST be routed to "Contact / visit in person" (and must NOT
 * receive an AI message draft) when ANY of these is true:
 *   1. category is "sick" or "grieving"
 *   2. the note contains a crisis, grief, or serious-illness keyword
 *      (in any supported output language — see CRISIS_KEYWORDS,
 *      GRIEF_KEYWORDS, ILLNESS_KEYWORDS below)
 *
 * This function is the single source of truth, used by the API route and by
 * the demo-mode generator. The LLM output is always overridden by it.
 */

export const CRISIS_KEYWORDS: string[] = [
  // English
  "suicide",
  "suicidal",
  "kill myself",
  "kill himself",
  "kill herself",
  "kill themself",
  "want to die",
  "thoughts of suicide",
  "end my life",
  "end his life",
  "end her life",
  "end it all",
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
  // Spanish
  "suicidio",
  "quiero morir",
  "quiere morir",
  "matarme",
  "quitarme la vida",
  "hacerme daño",
  "autolesión",
  "depresión grave",
  "violencia doméstica",
  // Portuguese
  "suicídio",
  "quero morrer",
  "quer morrer",
  "me matar",
  "tirar a minha vida",
  "me machucar",
  "automutilação",
  "depressão grave",
  "violência doméstica",
  // French
  "je veux mourir",
  "veut mourir",
  "me tuer",
  "mettre fin à ma vie",
  "me faire du mal",
  "automutilation",
  "dépression grave",
  "violence domestique",
  // Korean
  "자살",
  "죽고 싶어",
  "죽고 싶다",
  "스스로 목숨을 끊",
  "자해",
  "심한 우울증",
  "가정 폭력",
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
  // Swahili
  "kujiua",
  "nataka kufa",
  "kujidhuru",
  "kujijeruhi",
  "unyanyasaji wa nyumbani",
  "vurugu za nyumbani",
  // Tagalog
  "magpakamatay",
  "gusto kong mamatay",
  "saktan ang sarili",
  "panakit sa sarili",
  "matinding depresyon",
  "karahasan sa tahanan",
  // Italian
  "voglio morire",
  "vuole morire",
  "uccidermi",
  "togliersi la vita",
  "farmi del male",
  "autolesionismo",
  "depressione grave",
  "violenza domestica",
  // Russian
  "самоубийство",
  "суицид",
  "хочу умереть",
  "хочет умереть",
  "умереть",
  "покончить с собой",
  "причинить себе вред",
  "тяжёлая депрессия",
  "домашнее насилие",
  // Japanese
  "自殺",
  "死にたい",
  "自分を傷つけ",
  "自傷",
  "重度のうつ",
  "家庭内暴力",
  // Chinese (Simplified)
  "自杀",
  "想死",
  "结束生命",
  "自残",
  "自我伤害",
  "严重抑郁",
  "家庭暴力",
];

/**
 * Grief keywords — a note mentioning a death or bereavement also routes
 * to in-person contact (no AI draft), even when the category is not
 * "grieving". Kept separate from crisis keywords so the crisis warning
 * is only shown for crisis notes.
 */
export const GRIEF_KEYWORDS: string[] = [
  // English
  "passed away",
  "has died",
  "she died",
  "he died",
  "lost her husband",
  "lost his wife",
  "lost her mother",
  "lost his mother",
  "lost her father",
  "lost his father",
  "lost her son",
  "lost his son",
  "lost her daughter",
  "lost his daughter",
  "lost a loved one",
  "funeral",
  "bereaved",
  "mourning",
  // Spanish
  "falleció",
  "murió",
  "perdió a su esposo",
  "perdió a su esposa",
  "perdió a su madre",
  "perdió a su padre",
  "funeral",
  "de luto",
  // Portuguese
  "faleceu",
  "morreu",
  "perdeu o marido",
  "perdeu a esposa",
  "perdeu a mãe",
  "perdeu o pai",
  "funeral",
  "de luto",
  // French
  "est décédé",
  "est décédée",
  "a perdu son mari",
  "a perdu sa femme",
  "a perdu sa mère",
  "a perdu son père",
  "funérailles",
  "en deuil",
  // Korean
  "돌아가셨",
  "사망했",
  "장례식",
  "상실",
  // Indonesian
  "meninggal",
  "wafat",
  "kehilangan suami",
  "kehilangan istri",
  "kehilangan ibu",
  "kehilangan ayah",
  "pemakaman",
  "berduka",
  // Swahili
  "amefariki",
  "alifariki",
  "mazishi",
  "msiba",
  // Tagalog
  "pumanaw",
  "namatay",
  "nawalan ng asawa",
  "nawalan ng ina",
  "nawalan ng ama",
  "libing",
  "nagluluksa",
  // Italian
  "è morto",
  "è morta",
  "ha perso il marito",
  "ha perso la moglie",
  "ha perso la madre",
  "ha perso il padre",
  "funerale",
  "in lutto",
  // Russian
  "умер",
  "умерла",
  "скончался",
  "скончалась",
  "потерял жену",
  "потеряла мужа",
  "потерял мать",
  "потеряла мать",
  "похороны",
  "в трауре",
  // Japanese
  "亡くな",
  "死去",
  "葬儀",
  "喪中",
  // Chinese (Simplified)
  "去世",
  "过世",
  "丧失",
  "葬礼",
  "哀悼",
];

/** Serious-illness keywords — same routing as grief: visit, no draft. */
export const ILLNESS_KEYWORDS: string[] = [
  // English
  "terminal illness",
  "terminal cancer",
  "stage 4 cancer",
  "stage iv cancer",
  "in hospital",
  "in the hospital",
  "hospitalized",
  "hospitalised",
  "intensive care",
  "in icu",
  "chemotherapy",
  // Spanish
  "enfermedad terminal",
  "cáncer terminal",
  "en el hospital",
  "hospitalizado",
  "hospitalizada",
  "cuidados intensivos",
  "quimioterapia",
  // Portuguese
  "doença terminal",
  "câncer terminal",
  "no hospital",
  "hospitalizado",
  "hospitalizada",
  "terapia intensiva",
  "quimioterapia",
  // French
  "maladie terminale",
  "cancer terminal",
  "à l'hôpital",
  "hospitalisé",
  "hospitalisée",
  "soins intensifs",
  "chimiothérapie",
  // Korean
  "말기 암",
  "말기 질환",
  "입원 중",
  "중환자실",
  "항암 치료",
  // Indonesian
  "penyakit terminal",
  "kanker stadium 4",
  "di rumah sakit",
  "dirawat di rumah sakit",
  "ruang icu",
  "kemoterapi",
  // Swahili
  "ugonjwa wa mwisho",
  "hospitalini",
  "amelazwa hospitalini",
  // Tagalog
  "malubhang sakit",
  "nasa ospital",
  "naospital",
  "chemotherapy",
  // Italian
  "malattia terminale",
  "cancro terminale",
  "in ospedale",
  "ricoverato",
  "ricoverata",
  "terapia intensiva",
  "chemioterapia",
  // Russian
  "терминальная стадия",
  "в больнице",
  "госпитализирован",
  "госпитализирована",
  "реанимация",
  "химиотерапия",
  // Japanese
  "末期がん",
  "末期癌",
  "入院中",
  "集中治療室",
  "化学療法",
  // Chinese (Simplified)
  "晚期癌症",
  "住院",
  "重症监护",
  "化疗",
];

function noteHasKeyword(note: string, keywords: string[]): boolean {
  const hay = ` ${note.toLowerCase()} `;
  return keywords.some((kw) => hay.includes(kw.toLowerCase()));
}

export function noteHasCrisisKeyword(note: string): boolean {
  return noteHasKeyword(note, CRISIS_KEYWORDS);
}

export function noteHasGriefKeyword(note: string): boolean {
  return noteHasKeyword(note, GRIEF_KEYWORDS);
}

export function noteHasIllnessKeyword(note: string): boolean {
  return noteHasKeyword(note, ILLNESS_KEYWORDS);
}

/** Categories that always require in-person contact, no AI draft. */
export const VISIT_ONLY_CATEGORIES: Category[] = ["sick", "grieving"];

export interface TriageDecision {
  action: "message" | "visit";
  crisis: boolean;
  reason: "category" | "crisis" | "grief" | "illness" | "none";
}

/** Pure, deterministic triage decision for one congregant. */
export function triageCongregant(person: Congregant): TriageDecision {
  const note = person.note || "";
  const crisis = noteHasCrisisKeyword(note);
  if (crisis) return { action: "visit", crisis: true, reason: "crisis" };
  if (noteHasGriefKeyword(note)) return { action: "visit", crisis: false, reason: "grief" };
  if (noteHasIllnessKeyword(note)) return { action: "visit", crisis: false, reason: "illness" };
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
      const defaultSuggestion = decision.crisis
        ? "Contact today. Listen first, do not counsel alone — involve the pastor and, if needed, a professional."
        : decision.reason === "grief"
          ? "Call today, listen first, and offer your presence — not advice."
          : "Call today, listen first, and offer a visit this week.";
      return {
        initials: p.initials,
        action: "visit" as const,
        // Never trust an AI suggestion for a visit case blindly; keep a safe,
        // human-centred default unless the AI gave one.
        suggestion:
          ai?.suggestion && ai.suggestion.trim().length > 0 ? ai.suggestion : defaultSuggestion,
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
