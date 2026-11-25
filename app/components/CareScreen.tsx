"use client";

import { useState } from "react";
import type { CareItem, GenerateResult, OutputLang, UiLang } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { formatCopy, type CopyFormat } from "@/lib/copyFormats";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  uiLang: UiLang;
  outputLang: OutputLang;
  result: GenerateResult;
  care: CareItem[];
  setCare: (v: CareItem[]) => void;
  aiNote: boolean;
  setAiNote: (v: boolean) => void;
  onDownloadTxt: (sections: "care" | "all") => void;
  onDownloadPdf: (sections: "care" | "all") => void;
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.5h.01" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export default function CareScreen(p: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("text");
  const [copyAiNote, setCopyAiNote] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Record<string, string>>({});

  const update = (initials: string, patch: Partial<CareItem>) => {
    p.setCare(p.care.map((c) => (c.initials === initials ? { ...c, ...patch } : c)));
  };

  /** One copy path for sighted and screen-reader users: the Async
   *  Clipboard API first, execCommand as a last resort, and the result
   *  announced in a role="status" region outside the button. */
  const writeToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const previousFocus = document.activeElement as HTMLElement | null;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
      previousFocus?.focus({ preventScroll: true });
      return ok;
    }
  };

  const announceCopy = (initials: string, ok: boolean) => {
    const message = ok ? p.t.copied : p.t.copyFailed;
    setCopyStatus((s) => ({ ...s, [initials]: message }));
    setTimeout(() => {
      setCopyStatus((s) => {
        const next = { ...s };
        delete next[initials];
        return next;
      });
    }, 3000);
  };

  const copyDraft = async (c: CareItem) => {
    if (!c.draft) return;
    const ok = await writeToClipboard(c.draft);
    announceCopy(c.initials, ok);
    if (ok) {
      setCopiedId(c.initials);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  /** Copy an approved or edited draft in the chosen ready-to-send
   *  format. Only ever offered for "Send a message" people — visit
   *  cases have no draft and no copy options. */
  const copyAsFormat = async (c: CareItem) => {
    if (!c.draft) return;
    const text = formatCopy(
      c.draft,
      copyFormat,
      p.outputLang,
      copyFormat === "email" && copyAiNote
    );
    const ok = await writeToClipboard(text);
    announceCopy(c.initials, ok);
  };

  const personLabel = (verb: "approve" | "edit" | "copy", initials: string) => {
    if (p.uiLang === "id") {
      if (verb === "approve") return `Setujui pesan untuk ${initials}`;
      if (verb === "edit") return `Edit pesan untuk ${initials}`;
      return `Salin pesan untuk ${initials}`;
    }
    if (verb === "approve") return `Approve message for ${initials}`;
    if (verb === "edit") return `Edit message for ${initials}`;
    return `Copy message for ${initials}`;
  };

  const visitCalm =
    p.uiLang === "id"
      ? "Orang ini butuh sentuhan pribadi. Telepon atau kunjungi langsung."
      : "This person needs a personal touch. Call or visit in person.";
  const visitNote =
    p.uiLang === "id"
      ? "Tidak ada draf pesan AI untuk orang ini."
      : "No AI message draft for this person.";

  return (
    <div className="space-y-4" aria-live="polite">
      {p.result.demoMode && (
        <div className="card flex items-start gap-2 p-3 font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">
          <span className="mt-0.5 shrink-0 text-bulletin-olive dark:text-bulletin-oliveLight">
            <InfoIcon />
          </span>
          {p.t.demoBanner}
        </div>
      )}
      <p className="card flex items-center gap-2 p-3 font-sans text-xs font-semibold tracking-wide text-bulletin-muted dark:text-bulletin-mutedDark">
        <span className="text-bulletin-olive dark:text-bulletin-oliveLight">
          <InfoIcon />
        </span>
        {p.t.aiDraftLabel}
      </p>

      <h2 className="font-serif text-2xl font-semibold">{p.t.careTitle}</h2>

      <ul className="space-y-4">
        {p.care.map((c) => (
          <li
            key={c.initials}
            aria-labelledby={`person-${c.initials}`}
            className={`card p-4 ${c.action === "visit" ? "border-l-4 border-l-bulletin-brick dark:border-l-bulletin-brickLight" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`person-${c.initials}`} className="font-serif text-lg font-semibold">
                {c.initials}
                <span className="ml-2 font-sans text-sm font-normal text-bulletin-muted dark:text-bulletin-mutedDark">
                  {CATEGORY_LABELS[c.category][p.uiLang]}
                </span>
              </h3>
              {c.action === "visit" ? (
                <span className="inline-flex min-h-[2rem] items-center gap-1.5 rounded-full border border-bulletin-brick bg-bulletin-brickSoft px-2.5 py-1 font-sans text-xs font-semibold text-bulletin-brick dark:border-bulletin-brickLight dark:bg-bulletin-brickSoftDark dark:text-bulletin-brickLight">
                  <PhoneIcon />
                  {p.t.visit}
                </span>
              ) : (
                <span className="inline-flex min-h-[2rem] items-center gap-1.5 rounded-full bg-bulletin-badgeTint px-2.5 py-1 font-sans text-xs font-semibold text-bulletin-oliveDeep dark:bg-bulletin-badgeTintDark dark:text-bulletin-oliveLight">
                  <SendIcon />
                  {p.t.sendMessage}
                </span>
              )}
            </div>

            {c.crisis && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-bulletin-brick/40 bg-bulletin-brickSoft p-3 font-sans text-sm font-medium text-bulletin-brick dark:bg-bulletin-brickSoftDark dark:text-bulletin-brickLight">
                <span className="mt-0.5 shrink-0">
                  <WarnIcon />
                </span>
                {p.t.crisisWarning}
              </p>
            )}

            <p className="mt-3 text-sm leading-relaxed text-bulletin-ink dark:text-bulletin-inkDark">
              <span className="font-sans font-semibold">{p.t.suggestion}: </span>
              {c.suggestion}
            </p>

            {c.action === "message" && c.draft && (
              <div className="mt-3 rounded-xl border border-bulletin-line bg-bulletin-bg p-3 dark:border-bulletin-lineDark dark:bg-bulletin-bgDark">
                <p className="eyebrow">{p.t.draft}</p>
                {editingId === c.initials ? (
                  <>
                    <label htmlFor={`edit-${c.initials}`} className="field-label mt-2">
                      {p.uiLang === "id" ? `Edit pesan untuk ${c.initials}` : `Edit message for ${c.initials}`}
                    </label>
                    <textarea
                      id={`edit-${c.initials}`}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="field leading-relaxed"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          update(c.initials, { draft: editText, draftEdited: true, draftApproved: false });
                          setEditingId(null);
                        }}
                        className="btn-primary px-3"
                      >
                        {p.t.saveEdit}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-ghost px-3">
                        {p.t.cancel}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-[1.0625rem] leading-relaxed">{c.draft}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        aria-label={personLabel("edit", c.initials)}
                        onClick={() => {
                          setEditingId(c.initials);
                          setEditText(c.draft || "");
                        }}
                        className="btn-small border border-bulletin-line bg-bulletin-card text-bulletin-ink hover:bg-bulletin-bg dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-inkDark dark:hover:bg-bulletin-cardDark"
                      >
                        {p.t.edit}
                      </button>
                      <button
                        type="button"
                        aria-label={
                          c.draftApproved
                            ? p.uiLang === "id"
                              ? `Pesan untuk ${c.initials} sudah disetujui`
                              : `Message for ${c.initials} approved`
                            : personLabel("approve", c.initials)
                        }
                        onClick={() => update(c.initials, { draftApproved: true })}
                        disabled={c.draftApproved}
                        className={`btn-small ${
                          c.draftApproved
                            ? "bg-bulletin-badgeTint text-bulletin-oliveDeep dark:bg-bulletin-badgeTintDark dark:text-bulletin-oliveLight"
                            : "bg-bulletin-olive text-white hover:bg-bulletin-oliveDeep dark:bg-bulletin-oliveLight dark:text-bulletin-bgDark dark:hover:bg-[#bcd8b2]"
                        } disabled:opacity-70`}
                      >
                        {c.draftApproved && <CheckIcon />}
                        {c.draftApproved ? p.t.approved : p.t.approve}
                      </button>
                      <button
                        type="button"
                        aria-label={
                          copiedId === c.initials
                            ? p.uiLang === "id"
                              ? `Pesan untuk ${c.initials} disalin`
                              : `Message for ${c.initials} copied`
                            : personLabel("copy", c.initials)
                        }
                        onClick={() => copyDraft(c)}
                        className="btn-small border border-bulletin-line bg-bulletin-card text-bulletin-ink hover:bg-bulletin-bg dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-inkDark dark:hover:bg-bulletin-cardDark"
                      >
                        {copiedId === c.initials && <CheckIcon />}
                        {copiedId === c.initials ? p.t.copied : p.t.copy}
                      </button>
                      {!c.draftApproved && (
                        <span className="inline-flex min-h-[2rem] items-center gap-1.5 font-sans text-xs font-semibold text-bulletin-muted dark:text-bulletin-mutedDark">
                          <span className="border-b border-dashed border-bulletin-muted dark:border-bulletin-mutedDark">{p.t.notApproved}</span>
                        </span>
                      )}
                      <span
                        role="status"
                        className="inline-flex min-h-[2rem] items-center font-sans text-xs font-semibold text-bulletin-olive dark:text-bulletin-oliveLight"
                      >
                        {copyStatus[c.initials] || ""}
                      </span>
                    </div>
                    {(c.draftApproved || c.draftEdited) && (
                      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-bulletin-line pt-3 dark:border-bulletin-lineDark">
                        <div>
                          <label htmlFor={`copyas-${c.initials}`} className="field-label">
                            {p.t.copyAs}
                          </label>
                          <select
                            id={`copyas-${c.initials}`}
                            value={copyFormat}
                            onChange={(e) => setCopyFormat(e.target.value as CopyFormat)}
                            className="field w-auto"
                          >
                            <option value="text">{p.t.copyText}</option>
                            <option value="whatsapp">{p.t.copyWhatsApp}</option>
                            <option value="email">{p.t.copyEmail}</option>
                          </select>
                        </div>
                        {copyFormat === "email" && (
                          <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-2 font-sans text-sm">
                            <input
                              type="checkbox"
                              checked={copyAiNote}
                              onChange={(e) => setCopyAiNote(e.target.checked)}
                              className="h-5 w-5 shrink-0 accent-[#3f5b3a] dark:accent-[#a9c79f]"
                            />
                            <span>{p.t.addAiNoteEmail}</span>
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => copyAsFormat(c)}
                          aria-label={
                            p.uiLang === "id"
                              ? `Salin pesan untuk ${c.initials} sebagai ${
                                  copyFormat === "text" ? p.t.copyText : copyFormat === "whatsapp" ? p.t.copyWhatsApp : p.t.copyEmail
                                }`
                              : `Copy message for ${c.initials} as ${
                                  copyFormat === "text" ? p.t.copyText : copyFormat === "whatsapp" ? p.t.copyWhatsApp : p.t.copyEmail
                                }`
                          }
                          className="btn-small bg-bulletin-olive text-white hover:bg-bulletin-oliveDeep dark:bg-bulletin-oliveLight dark:text-bulletin-bgDark dark:hover:bg-[#bcd8b2]"
                        >
                          {p.t.copy}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {c.action === "visit" && (
              <div className="mt-3">
                <p className="flex items-start gap-2 text-bulletin-brick dark:text-bulletin-brickLight">
                  <span className="mt-1 shrink-0">
                    <PhoneIcon />
                  </span>
                  {visitCalm}
                </p>
                <p className="mt-1 font-sans text-xs italic text-bulletin-muted dark:text-bulletin-mutedDark">{visitNote}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <label className="card flex min-h-[2.75rem] cursor-pointer items-start gap-2 p-3 font-sans text-sm">
        <input
          type="checkbox"
          checked={p.aiNote}
          onChange={(e) => p.setAiNote(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#3f5b3a] dark:accent-[#a9c79f]"
        />
        <span>{p.t.aiNoteToggle}</span>
      </label>

      <div className="sticky bottom-0 -mx-4 border-t border-bulletin-line bg-bulletin-bg px-4 pt-3 pb-safe dark:border-bulletin-lineDark dark:bg-bulletin-bgDark">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => p.onDownloadTxt("care")} className="btn-primary">
            <DownloadIcon />
            {p.t.downloadTxt}
          </button>
          <button type="button" onClick={() => p.onDownloadPdf("care")} className="btn-secondary">
            <DownloadIcon />
            {p.t.downloadPdf}
          </button>
          <button type="button" onClick={() => p.onDownloadTxt("all")} className="btn-ghost">
            <DownloadIcon />
            {p.t.downloadAllTxt}
          </button>
          <button type="button" onClick={() => p.onDownloadPdf("all")} className="btn-ghost">
            <DownloadIcon />
            {p.t.downloadAllPdf}
          </button>
        </div>
      </div>
    </div>
  );
}
