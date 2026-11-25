import type { OutputLang } from "./types";
import { OUTPUT_LANGUAGES } from "./languages";

export type CopyFormat = "text" | "whatsapp" | "email";

export const TEXT_MESSAGE_MAX_CHARS = 300;

/** Plain text, no markdown. Strips *, _, `, # and link syntax. */
export function stripMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>|]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Text message: short and plain, under 300 characters. The draft is
 * trimmed at a word boundary where possible; the sign-off is kept only
 * when it still fits.
 */
export function formatTextMessage(draft: string): string {
  const base = stripMarkdown(draft);
  const signOff = " — [Your name]";
  const withSignOff = base + signOff;
  if (withSignOff.length <= TEXT_MESSAGE_MAX_CHARS) return withSignOff;
  if (base.length <= TEXT_MESSAGE_MAX_CHARS) return base;
  const cut = base.slice(0, TEXT_MESSAGE_MAX_CHARS - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

/**
 * WhatsApp: short, keeps line breaks, ends with the name placeholder
 * on its own line. The pastor copies and sends it manually.
 */
export function formatWhatsApp(draft: string): string {
  const base = stripMarkdown(draft);
  return `${base}\n\n[Your name]`;
}

/**
 * Email: a subject line, the draft, then the sign-off placeholder.
 * When aiNote is on, an AI-assistance note is added (in the output
 * language and in English). The whole body is plain text.
 */
export function formatEmail(draft: string, lang: OutputLang, aiNote: boolean): string {
  const info = OUTPUT_LANGUAGES[lang];
  const base = stripMarkdown(draft);
  const lines = [
    `Subject: ${info.emailSubject}`,
    "",
    base,
    "",
    "[Your name]",
  ];
  if (aiNote) {
    lines.push("");
    lines.push(
      lang === "en"
        ? info.aiNote
        : `${info.aiNote} / Prepared with AI help, reviewed by pastor.`
    );
  }
  return lines.join("\n");
}

export function formatCopy(
  draft: string,
  format: CopyFormat,
  lang: OutputLang,
  aiNote: boolean
): string {
  if (format === "text") return formatTextMessage(draft);
  if (format === "whatsapp") return formatWhatsApp(draft);
  return formatEmail(draft, lang, aiNote);
}
