import type { OutputLang } from "./types";

/**
 * Per-output-language metadata — the single source of truth for every
 * language-dependent string that is NOT UI copy (UI stays English with
 * an Indonesian toggle; see lib/i18n.ts).
 *
 * - name: English name, used in LLM prompts.
 * - nativeName: shown in the output-language dropdown.
 * - beta: Russian, Japanese and Chinese are Beta — outputs need a native
 *   speaker review (see the beta note in InputScreen / ResultsScreen).
 * - speechLocale: BCP 47 tag for webkitSpeechRecognition dictation.
 * - days: Monday–Friday names, used for devotion headings.
 * - aiDraftLabel / closingPrayer / emailSubject / aiNote: output-language
 *   strings used in downloads, the handout and copied messages. The
 *   English "AI draft. Pastor review required." is always shown next
 *   to the translated label.
 */

export interface OutputLanguageInfo {
  name: string;
  nativeName: string;
  beta: boolean;
  speechLocale: string;
  days: [string, string, string, string, string];
  aiDraftLabel: string;
  closingPrayer: string;
  emailSubject: string;
  aiNote: string;
}

export const OUTPUT_LANGUAGES: Record<OutputLang, OutputLanguageInfo> = {
  en: {
    name: "English",
    nativeName: "English",
    beta: false,
    speechLocale: "en-US",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    aiDraftLabel: "AI draft. Pastor review required.",
    closingPrayer: "Lord, help us live what we heard today. Amen.",
    emailSubject: "A short note from your church",
    aiNote: "Prepared with AI help, reviewed by pastor.",
  },
  es: {
    name: "Spanish",
    nativeName: "Español",
    beta: false,
    speechLocale: "es-ES",
    days: ["lunes", "martes", "miércoles", "jueves", "viernes"],
    aiDraftLabel: "Borrador de IA. Se requiere revisión del pastor.",
    closingPrayer: "Señor, ayúdanos a vivir lo que escuchamos hoy. Amén.",
    emailSubject: "Una nota breve de tu iglesia",
    aiNote: "Preparado con ayuda de IA, revisado por el pastor.",
  },
  pt: {
    name: "Portuguese",
    nativeName: "Português",
    beta: false,
    speechLocale: "pt-BR",
    days: ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira"],
    aiDraftLabel: "Rascunho de IA. Revisão do pastor necessária.",
    closingPrayer: "Senhor, ajuda-nos a viver o que ouvimos hoje. Amém.",
    emailSubject: "Um recado breve da sua igreja",
    aiNote: "Preparado com ajuda de IA, revisado pelo pastor.",
  },
  fr: {
    name: "French",
    nativeName: "Français",
    beta: false,
    speechLocale: "fr-FR",
    days: ["lundi", "mardi", "mercredi", "jeudi", "vendredi"],
    aiDraftLabel: "Brouillon IA. Révision du pasteur requise.",
    closingPrayer: "Seigneur, aide-nous à vivre ce que nous avons entendu aujourd'hui. Amen.",
    emailSubject: "Un petit mot de ton église",
    aiNote: "Préparé avec l'aide de l'IA, relu par le pasteur.",
  },
  ko: {
    name: "Korean",
    nativeName: "한국어",
    beta: false,
    speechLocale: "ko-KR",
    days: ["월요일", "화요일", "수요일", "목요일", "금요일"],
    aiDraftLabel: "AI 초안. 목회자의 검토가 필요합니다.",
    closingPrayer: "주님, 오늘 들은 말씀대로 살 수 있도록 도와주세요. 아멘.",
    emailSubject: "교회에서 보내는 짧은 인사",
    aiNote: "AI의 도움을 받아 작성하고 목회자가 검토했습니다.",
  },
  id: {
    name: "Bahasa Indonesia",
    nativeName: "Bahasa Indonesia",
    beta: false,
    speechLocale: "id-ID",
    days: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
    aiDraftLabel: "Draf AI. Perlu ditinjau pastor.",
    closingPrayer: "Tuhan, tolong kami menghidupi apa yang kami dengar hari ini. Amin.",
    emailSubject: "Catatan singkat dari gerejamu",
    aiNote: "Disusun dengan bantuan AI, ditinjau pastor.",
  },
  sw: {
    name: "Swahili",
    nativeName: "Kiswahili",
    beta: false,
    speechLocale: "sw-KE",
    days: ["Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa"],
    aiDraftLabel: "Rasimu ya AI. Inahitaji ukaguzi wa mchungaji.",
    closingPrayer: "Bwana, utusaidie kuishi tuliyoyasikia leo. Amina.",
    emailSubject: "Ujumbe mfupi kutoka kanisani kwako",
    aiNote: "Imeandaliwa kwa msaada wa AI, imekaguliwa na mchungaji.",
  },
  tl: {
    name: "Tagalog",
    nativeName: "Tagalog",
    beta: false,
    speechLocale: "tl-PH",
    days: ["Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes"],
    aiDraftLabel: "Draft ng AI. Kailangan ng pagsusuri ng pastor.",
    closingPrayer: "Panginoon, tulungan Mo kaming isabuhay ang narinig namin ngayon. Amen.",
    emailSubject: "Isang maikling mensahe mula sa iyong simbahan",
    aiNote: "Inihanda sa tulong ng AI, sinuri ng pastor.",
  },
  it: {
    name: "Italian",
    nativeName: "Italiano",
    beta: false,
    speechLocale: "it-IT",
    days: ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì"],
    aiDraftLabel: "Bozza AI. Revisione del pastore richiesta.",
    closingPrayer: "Signore, aiutaci a vivere ciò che abbiamo ascoltato oggi. Amen.",
    emailSubject: "Un breve messaggio dalla tua chiesa",
    aiNote: "Preparato con l'aiuto dell'IA, rivisto dal pastore.",
  },
  ru: {
    name: "Russian",
    nativeName: "Русский",
    beta: true,
    speechLocale: "ru-RU",
    days: ["понедельник", "вторник", "среда", "четверг", "пятница"],
    aiDraftLabel: "Черновик ИИ. Требуется проверка пастора.",
    closingPrayer: "Господи, помоги нам жить тем, что мы услышали сегодня. Аминь.",
    emailSubject: "Короткая записка из вашей церкви",
    aiNote: "Подготовлено с помощью ИИ, проверено пастором.",
  },
  ja: {
    name: "Japanese",
    nativeName: "日本語",
    beta: true,
    speechLocale: "ja-JP",
    days: ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日"],
    aiDraftLabel: "AI 下書き。牧師の確認が必要です。",
    closingPrayer: "主よ、今日聞いた御言葉のとおりに生きることができますよう、お助けください。アーメン。",
    emailSubject: "教会からの短いメッセージ",
    aiNote: "AIの助けを借りて作成し、牧師が確認しました。",
  },
  zh: {
    name: "Chinese (Simplified)",
    nativeName: "简体中文",
    beta: true,
    speechLocale: "zh-CN",
    days: ["星期一", "星期二", "星期三", "星期四", "星期五"],
    aiDraftLabel: "AI 草稿。需要牧师审核。",
    closingPrayer: "主啊,求你帮助我们活出今天所听到的道。阿们。",
    emailSubject: "来自你教会的一封简短信",
    aiNote: "在 AI 帮助下准备,由牧师审核。",
  },
};

/** Languages without spaces between words: count characters, not words. */
export const CHAR_COUNT_LANGS: OutputLang[] = ["ja", "zh"];

export function isCharCountLang(lang: OutputLang): boolean {
  return CHAR_COUNT_LANGS.includes(lang);
}

/** Transcript size in the units that apply to the language. */
export function countUnits(text: string, lang: OutputLang): number {
  if (isCharCountLang(lang)) {
    return text.replace(/\s+/g, "").length;
  }
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Maximum transcript size in the language's units. */
export function maxUnits(lang: OutputLang): number {
  return isCharCountLang(lang) ? 20000 : 8000;
}

/** Minimum transcript size in the language's units. */
export function minUnits(): number {
  return 30;
}
