import type { Audience, GenerateResult, OutputLang, UiLang } from "./types";
import { CATEGORY_LABELS } from "./types";
import { OUTPUT_LANGUAGES } from "./languages";

export interface DownloadOptions {
  uiLang: UiLang;
  /** "sermon" = summary + questions + devotions; "care" = care list only; "all" = both. */
  sections: "sermon" | "care" | "all";
  aiNote: boolean;
  outputLang: OutputLang;
  audience: Audience;
  transcriptTitle?: string;
}

/** Thrown when no usable font could be loaded for a PDF. Callers fall
 *  back to the .txt download and show a short notice. */
export class FontLoadError extends Error {
  constructor() {
    super("The PDF font could not be loaded.");
    this.name = "FontLoadError";
  }
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fileBaseName(): string {
  return `shepherdflow-${todayStr()}`;
}

const LABEL_EN = "AI draft. Pastor review required.";

/** The label in the output language AND in English (English alone when
 *  the output language already is English). */
export function aiDraftLabelLine(lang: OutputLang): string {
  if (lang === "en") return LABEL_EN;
  return `${OUTPUT_LANGUAGES[lang].aiDraftLabel} / ${LABEL_EN}`;
}

export function audienceLabel(audience: Audience, uiLang: UiLang): string {
  if (uiLang === "id") {
    if (audience === "teens") return "Remaja";
    if (audience === "children") return "Anak-anak (usia 6-11)";
    return "Dewasa";
  }
  if (audience === "teens") return "Teens";
  if (audience === "children") return "Children (ages 6-11)";
  return "Adults";
}

function catLabel(cat: keyof typeof CATEGORY_LABELS, lang: UiLang): string {
  return CATEGORY_LABELS[cat][lang];
}

export function buildTxt(result: GenerateResult, opts: DownloadOptions): string {
  const { uiLang } = opts;
  const L: string[] = [];
  const en = uiLang === "en";
  L.push(`# ShepherdFlow — ${en ? "Sermon Follow-up" : "Tindak Lanjut Khotbah"}`);
  L.push(`${en ? "Date" : "Tanggal"}: ${todayStr()}`);
  L.push(`${en ? "Written for" : "Ditulis untuk"}: ${audienceLabel(result.audience, uiLang)}`);
  L.push("");
  L.push("----------------------------------------------------------------");
  L.push(aiDraftLabelLine(result.outputLang));
  if (opts.aiNote)
    L.push(
      result.outputLang === "en"
        ? OUTPUT_LANGUAGES.en.aiNote
        : `${OUTPUT_LANGUAGES[result.outputLang].aiNote} / ${OUTPUT_LANGUAGES.en.aiNote}`
    );
  if (result.demoMode) L.push(en ? "Demo mode — sample results." : "Mode demo — hasil contoh.");
  const showSermon = opts.sections !== "care";
  const showCare = opts.sections !== "sermon";
  L.push("");
  if (showSermon) {
  L.push(`## ${en ? "Summary" : "Ringkasan"}`);
  for (const s of result.summary) {
    L.push(`- ${s.text}`);
    L.push(`  ${en ? "Source" : "Sumber"}: "${s.quote}"${s.quoteVerified ? "" : " — SOURCE UNVERIFIED"}`);
  }
  L.push("");
  L.push(`## ${en ? "Small-group discussion questions" : "Pertanyaan diskusi small group"}`);
  result.questions.forEach((q, i) => {
    L.push(`${i + 1}. ${q.text}`);
    L.push(`   ${en ? "Source" : "Sumber"}: "${q.quote}"${q.quoteVerified ? "" : " — SOURCE UNVERIFIED"}`);
  });
  L.push("");
  L.push(`## ${en ? "Daily devotions" : "Renungan harian"}`);
  for (const d of result.devotions) {
    L.push(`### ${d.day}`);
    L.push(d.text);
    L.push(`${en ? "Prayer" : "Doa"}: ${d.prayer}`);
    L.push("");
  }
  if (result.versesFlagged.length > 0) {
    L.push(`## ${en ? "Verse check" : "Pemeriksaan ayat"}`);
    for (const v of result.versesFlagged) {
      L.push(`- ${v} — ${en ? "VERSE NOT IN SERMON" : "AYAT TIDAK ADA DI KHOTBAH"}`);
    }
    L.push("");
  }
  }
  if (showCare) {
    L.push(`## ${en ? "Care follow-up" : "Tindak lanjut jemaat"}`);
    for (const c of result.care) {
      L.push(`- ${c.initials} — ${catLabel(c.category, uiLang)} — ${c.action === "visit" ? (en ? "Contact / visit in person" : "Hubungi / kunjungi langsung") : en ? "Send a message" : "Kirim pesan"}`);
      L.push(`  ${en ? "Suggestion" : "Saran"}: ${c.suggestion}`);
      if (c.crisis) L.push(`  ${en ? "Warning" : "Peringatan"}: ${en ? "Crisis words detected — involve the pastor and, if needed, a professional." : "Kata kunci krisis terdeteksi — libatkan pastor dan, bila perlu, seorang profesional."}`);
      if (c.action === "message" && c.draft) {
        const status = c.draftApproved ? (en ? "APPROVED" : "DISETUJUI") : c.draftEdited ? (en ? "EDITED — NOT APPROVED" : "DIEDIT — BELUM DISETUJUI") : "NOT APPROVED";
        L.push(`  ${en ? "Draft" : "Draf"} [${status}]: ${c.draft}`);
      }
    }
    L.push("");
  }
  L.push("----------------------------------------------------------------");
  L.push(aiDraftLabelLine(result.outputLang));
  return L.join("\n");
}

/** ASCII-safe text for jsPDF's built-in fonts (WinAnsi). */
export function pdfSafe(s: string): string {
  return s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/[^\x20-\x7E\n]/g, "");
}

/* ------------------------------------------------------------------ */
/* Embedded fonts for non-Latin scripts                                */
/*                                                                     */
/* jsPDF's built-in fonts are WinAnsi-only, so Russian, Japanese,      */
/* Chinese, Korean and accented Latin text need an embedded TTF.       */
/* Strategy: a subsetted TTF from the Google Fonts css2 API (text=     */
/* parameter; a non-browser/old user agent returns TTF instead of      */
/* woff2). A modern browser sends a woff2-capable UA, so that attempt  */
/* usually returns woff2 — detected by magic bytes and skipped, and    */
/* the caller then falls back to the .txt download.                    */
/*                                                                     */
/* A full static TTF (e.g. Noto Sans JP, 4.5 MB) is deliberately NOT   */
/* used as a fallback: jsPDF 2.5.2's built-in TTF parser cannot handle */
/* it — it logs a glyphFor PubSub error and produces a corrupt PDF     */
/* with garbled text (verified in Node, 25 Nov 2026). The Google      */
/* subset is small and simple enough for jsPDF to embed correctly.     */
/* Documents with more than 1500 unique characters therefore fall     */
/* back to .txt + notice instead of a broken PDF. Real sermon          */
/* follow-ups stay far below that (the Japanese demo uses ~400).       */
/* ------------------------------------------------------------------ */

const FONT_SOURCES: Record<string, { cssFamily: string }> = {
  NotoSans: { cssFamily: "Noto Sans" },
  NotoSansJP: { cssFamily: "Noto Sans JP" },
  NotoSansSC: { cssFamily: "Noto Sans SC" },
  NotoSansKR: { cssFamily: "Noto Sans KR" },
};

function fontFamilyForText(text: string, lang: OutputLang): string | null {
  if (!/[^\x00-\x7F]/.test(text)) return null;
  if (/[\u3040-\u30FF]/.test(text)) return "NotoSansJP"; // hiragana / katakana
  if (/[\uAC00-\uD7A3]/.test(text)) return "NotoSansKR"; // hangul
  if (/[\u4E00-\u9FFF]/.test(text)) return lang === "zh" ? "NotoSansSC" : "NotoSansJP";
  if (/[\u0400-\u04FF]/.test(text)) return "NotoSans"; // Cyrillic
  return "NotoSans"; // accented Latin and other non-ASCII
}

async function fetchArrayBuffer(url: string, timeoutMs: number): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

function isTtf(buf: ArrayBuffer): boolean {
  const m = new Uint8Array(buf.slice(0, 4));
  return (
    (m[0] === 0 && m[1] === 1 && m[2] === 0 && m[3] === 0) ||
    String.fromCharCode(m[0], m[1], m[2], m[3]) === "true" ||
    String.fromCharCode(m[0], m[1], m[2], m[3]) === "OTTO"
  );
}

async function loadFontBytes(family: string, text: string): Promise<ArrayBuffer> {
  // Subsetted TTF from Google Fonts (only usable when it really is TTF).
  // The subset MUST include the ASCII characters too: the document is
  // mostly ASCII text, and a subset without them renders blanks.
  // Throws FontLoadError when no usable subset can be fetched.
  const unique = [...new Set(text.replace(/\s+/g, ""))].join("");
  if (unique.length === 0) throw new Error("No characters to subset");
  if (unique.length > 1500) {
    throw new Error("Too many unique characters for a font subset");
  }
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    FONT_SOURCES[family].cssFamily
  )}&text=${encodeURIComponent(unique)}`;
  const css = await (await fetch(cssUrl)).text();
  const m = css.match(/url\((https:[^)]+)\)/);
  if (!m) throw new Error("No font URL in Google Fonts response");
  const buf = await fetchArrayBuffer(m[1], 30000);
  if (!isTtf(buf)) throw new Error("Google Fonts returned woff2, not TTF");
  return buf;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

/**
 * Embed the font a document needs and return its jsPDF family name,
 * or null when the built-in font is enough. Throws FontLoadError when
 * a needed font cannot be loaded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureFont(doc: any, text: string, lang: OutputLang): Promise<string | null> {
  const family = fontFamilyForText(text, lang);
  if (!family) return null;
  if (doc.getFontList()[family]) return family;
  let buf: ArrayBuffer;
  try {
    buf = await loadFontBytes(family, text);
  } catch {
    throw new FontLoadError();
  }
  doc.addFileToVFS(`${family}.ttf`, arrayBufferToBase64(buf));
  doc.addFont(`${family}.ttf`, family, "normal");
  doc.addFont(`${family}.ttf`, family, "bold");
  return family;
}

/** All text that will appear in a full PDF, used to pick the font. */
function fullPdfText(result: GenerateResult, opts: DownloadOptions): string {
  const parts: string[] = [
    ...result.summary.map((s) => `${s.text} ${s.quote}`),
    ...result.questions.map((q) => `${q.text} ${q.quote}`),
    ...result.devotions.map((d) => `${d.day} ${d.text} ${d.prayer}`),
    ...result.care.map((c) => `${c.initials} ${c.suggestion} ${c.draft || ""}`),
    ...result.versesFlagged,
    aiDraftLabelLine(result.outputLang),
  ];
  return parts.join("\n");
}

export async function downloadTxtFile(result: GenerateResult, opts: DownloadOptions): Promise<void> {
  const text = buildTxt(result, opts);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBaseName()}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPdfFile(
  result: GenerateResult,
  opts: DownloadOptions,
  returnBytes = false
): Promise<ArrayBuffer | void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const font = await ensureFont(doc, fullPdfText(result, opts), result.outputLang);
  const pageW = 210;
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = 18;

  const en = opts.uiLang === "en";
  const checkPage = (needed: number) => {
    if (y + needed > 282) {
      doc.addPage();
      y = 18;
    }
  };
  /** Thin decorative rule. Gold for the header rule only; line colour elsewhere. */
  const rule = (gold: boolean) => {
    checkPage(6);
    if (gold) doc.setDrawColor(184, 146, 58);
    else doc.setDrawColor(220, 210, 188);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };
  const write = (text: string, size = 11, bold = false, gap = 5) => {
    if (font) doc.setFont(font, bold ? "bold" : "normal");
    else doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(font ? text : pdfSafe(text), maxW);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, margin, y);
      y += 5.2;
    }
    y += gap;
  };
  const heading = (text: string) => {
    checkPage(12);
    y += 2;
    rule(false);
    write(text, 13, true, 3);
  };

  write("ShepherdFlow", 18, true, 1);
  write(en ? "Sermon follow-up" : "Tindak lanjut khotbah", 12, false, 2);
  write(`${en ? "Date" : "Tanggal"}: ${todayStr()}`, 10, false, 2);
  write(`${en ? "Written for" : "Ditulis untuk"}: ${audienceLabel(result.audience, opts.uiLang)}`, 10, false, 4);
  rule(true);
  write(aiDraftLabelLine(result.outputLang), 10, true, 2);
  if (opts.aiNote)
    write(
      result.outputLang === "en"
        ? OUTPUT_LANGUAGES.en.aiNote
        : `${OUTPUT_LANGUAGES[result.outputLang].aiNote} / ${OUTPUT_LANGUAGES.en.aiNote}`,
      10,
      false,
      2
    );
  if (result.demoMode) write(en ? "Demo mode - sample results." : "Mode demo - hasil contoh.", 10, false, 4);

  const showSermon = opts.sections !== "care";
  const showCare = opts.sections !== "sermon";

  if (showSermon) {
  heading(en ? "Summary" : "Ringkasan");
  for (const s of result.summary) {
    write(`- ${s.text}`, 11, false, 1);
    write(`  ${en ? "Source" : "Sumber"}: "${s.quote}"${s.quoteVerified ? "" : " - SOURCE UNVERIFIED"}`, 9, false, 3);
  }

  heading(en ? "Small-group discussion questions" : "Pertanyaan diskusi small group");
  result.questions.forEach((q, i) => {
    write(`${i + 1}. ${q.text}`, 11, false, 1);
    write(`   ${en ? "Source" : "Sumber"}: "${q.quote}"${q.quoteVerified ? "" : " - SOURCE UNVERIFIED"}`, 9, false, 3);
  });

  heading(en ? "Daily devotions" : "Renungan harian");
  for (const d of result.devotions) {
    write(d.day, 11, true, 1);
    write(d.text, 11, false, 1);
    write(`${en ? "Prayer" : "Doa"}: ${d.prayer}`, 11, false, 4);
  }

  if (result.versesFlagged.length > 0) {
    heading(en ? "Verse check" : "Pemeriksaan ayat");
    for (const v of result.versesFlagged) {
      write(`- ${v} - ${en ? "VERSE NOT IN SERMON" : "AYAT TIDAK ADA DI KHOTBAH"}`, 10, false, 2);
    }
  }
  }

  if (showCare) {
    heading(en ? "Care follow-up" : "Tindak lanjut jemaat");
    for (const c of result.care) {
      write(
        `- ${c.initials} - ${catLabel(c.category, opts.uiLang)} - ${
          c.action === "visit"
            ? en
              ? "Contact / visit in person"
              : "Hubungi / kunjungi langsung"
            : en
              ? "Send a message"
              : "Kirim pesan"
        }`,
        11,
        true,
        1
      );
      write(`${en ? "Suggestion" : "Saran"}: ${c.suggestion}`, 10, false, 1);
      if (c.crisis)
        write(
          en
            ? "Warning: Crisis words detected - involve the pastor and, if needed, a professional."
            : "Peringatan: Kata kunci krisis terdeteksi - libatkan pastor dan, bila perlu, seorang profesional.",
          10,
          true,
          1
        );
      if (c.action === "message" && c.draft) {
        const status = c.draftApproved
          ? en
            ? "APPROVED"
            : "DISETUJUI"
          : c.draftEdited
            ? en
              ? "EDITED - NOT APPROVED"
              : "DIEDIT - BELUM DISETUJUI"
            : "NOT APPROVED";
        write(`${en ? "Draft" : "Draf"} [${status}]: ${c.draft}`, 10, false, 3);
      }
    }
  }

  y += 4;
  rule(false);
  write(aiDraftLabelLine(result.outputLang), 10, true, 0);
  if (returnBytes) return doc.output("arraybuffer") as ArrayBuffer;
  doc.save(`${fileBaseName()}.pdf`);
}

/**
 * Small-group handout — one printable page, black and white safe
 * (black text only, no colour that fails in print), same serif style
 * as the main PDF. Title and date field, a short summary, the 5
 * discussion questions, and one closing prayer line. Generated fully
 * in the browser. Throws FontLoadError when a needed font cannot be
 * loaded (caller falls back to .txt).
 */
export async function downloadHandoutPdf(
  result: GenerateResult,
  opts: DownloadOptions,
  returnBytes = false
): Promise<ArrayBuffer | void> {
  const { jsPDF } = await import("jspdf");
  const lang = result.outputLang;
  const info = OUTPUT_LANGUAGES[lang];
  const en = opts.uiLang === "en";
  const title = (opts.transcriptTitle || "").trim() || (en ? "Sermon follow-up" : "Tindak Lanjut Khotbah");
  const summaryText = result.summary.slice(0, 2).map((s) => s.text).join(" ");
  const handoutText = [
    title,
    summaryText,
    ...result.questions.map((q) => q.text),
    info.closingPrayer,
    aiDraftLabelLine(lang),
  ].join("\n");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const font = await ensureFont(doc, handoutText, lang);
  const pageW = 210;
  const margin = 18;
  const maxW = pageW - margin * 2;
  let y = 20;

  const write = (text: string, size = 11, bold = false, gap = 4) => {
    if (font) doc.setFont(font, bold ? "bold" : "normal");
    else doc.setFont("times", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(font ? text : pdfSafe(text), maxW);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += size * 0.48;
    }
    y += gap;
  };
  const rule = () => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
  };

  write(title, 18, true, 1);
  write(`${en ? "Date" : "Tanggal"}: ______`, 11, false, 2);
  write(`${en ? "Written for" : "Ditulis untuk"}: ${audienceLabel(result.audience, opts.uiLang)}`, 10, false, 4);
  rule();
  write(en ? "Summary" : "Ringkasan", 12, true, 2);
  write(summaryText, 11, false, 4);
  write(en ? "Small-group discussion questions" : "Pertanyaan diskusi small group", 12, true, 2);
  result.questions.forEach((q, i) => {
    write(`${i + 1}. ${q.text}`, 11, false, 3);
  });
  write(en ? "Closing prayer" : "Doa penutup", 12, true, 2);
  write(info.closingPrayer, 11, false, 6);
  rule();
  write(aiDraftLabelLine(lang), 9, true, 0);
  if (returnBytes) return doc.output("arraybuffer") as ArrayBuffer;
  doc.save(`${fileBaseName()}-handout.pdf`);
}
