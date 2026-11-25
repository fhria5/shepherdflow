import type { GenerateResult, UiLang } from "./types";
import { CATEGORY_LABELS } from "./types";

export interface DownloadOptions {
  uiLang: UiLang;
  /** "sermon" = summary + questions + devotions; "care" = care list only; "all" = both. */
  sections: "sermon" | "care" | "all";
  aiNote: boolean;
  transcriptTitle?: string;
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

const LABEL = "AI draft. Pastor review required";

function catLabel(cat: keyof typeof CATEGORY_LABELS, lang: UiLang): string {
  return CATEGORY_LABELS[cat][lang];
}

export function buildTxt(result: GenerateResult, opts: DownloadOptions): string {
  const { uiLang } = opts;
  const L: string[] = [];
  const en = uiLang === "en";
  L.push(`# ShepherdFlow — ${en ? "Sermon Follow-up" : "Tindak Lanjut Khotbah"}`);
  L.push(`${en ? "Date" : "Tanggal"}: ${todayStr()}`);
  L.push("");
  L.push(LABEL);
  if (opts.aiNote) L.push(en ? "Note: prepared with AI help, reviewed by pastor." : "Catatan: disusun dengan bantuan AI, ditinjau pastor.");
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
  L.push(LABEL);
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
  const write = (text: string, size = 11, bold = false, gap = 5) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(pdfSafe(text), maxW);
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
    write(text, 13, true, 3);
  };

  write("ShepherdFlow", 18, true, 1);
  write(en ? "Sermon follow-up" : "Tindak lanjut khotbah", 12, false, 2);
  write(`${en ? "Date" : "Tanggal"}: ${todayStr()}`, 10, false, 4);
  write(LABEL, 10, true, 2);
  if (opts.aiNote)
    write(en ? "Note: prepared with AI help, reviewed by pastor." : "Catatan: disusun dengan bantuan AI, ditinjau pastor.", 10, false, 2);
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
  write(LABEL, 10, true, 0);
  if (returnBytes) return doc.output("arraybuffer") as ArrayBuffer;
  doc.save(`${fileBaseName()}.pdf`);
}
