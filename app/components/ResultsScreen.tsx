"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GenerateResult, UiLang } from "@/lib/types";
import { normalizeText } from "@/lib/validate";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  uiLang: UiLang;
  result: GenerateResult;
  transcript: string;
  onDownloadTxt: () => void;
  onDownloadPdf: () => void;
  onDownloadHandout: () => void;
}

function sentenceList(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
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

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
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

interface SourceButtonProps {
  quote: string;
  verified: boolean;
  viewSourceLabel: string;
  sourceText: string;
  sourceUnverifiedText: string;
  onShow: (quote: string, btn: HTMLButtonElement | null) => void;
}

/** Module-level component (stable identity) so React never remounts
 *  the button on re-render — focus must survive the sheet closing. */
function SourceButton({ quote, verified, viewSourceLabel, sourceText, sourceUnverifiedText, onShow }: SourceButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => onShow(quote, e.currentTarget)}
      aria-label={`${viewSourceLabel}: “${quote}”`}
      className={`ml-1 inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-xs font-semibold ${
        verified
          ? "border-bulletin-line bg-bulletin-badgeTint text-bulletin-oliveDeep hover:bg-bulletin-badgeTint dark:border-bulletin-lineDark dark:bg-bulletin-badgeTintDark dark:text-bulletin-oliveLight"
          : "border-b border-dashed border-bulletin-brick bg-bulletin-brickSoft text-bulletin-brick dark:bg-bulletin-brickSoftDark dark:text-bulletin-brickLight"
      }`}
    >
      {verified ? <BookIcon /> : <WarnIcon />}
      {verified ? sourceText : sourceUnverifiedText}
    </button>
  );
}

export default function ResultsScreen({ t, uiLang, result, transcript, onDownloadTxt, onDownloadPdf, onDownloadHandout }: Props) {
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastSourceBtnRef = useRef<HTMLButtonElement | null>(null);
  const dragStartY = useRef<number | null>(null);

  const sentences = useMemo(() => sentenceList(transcript), [transcript]);

  const highlightIndex = useMemo(() => {
    if (!activeQuote) return -1;
    const q = normalizeText(activeQuote);
    return sentences.findIndex((s) => {
      const n = normalizeText(s);
      return n.includes(q) || q.includes(n.slice(0, 120));
    });
  }, [activeQuote, sentences]);

  const showSource = (quote: string, btn: HTMLButtonElement | null) => {
    lastSourceBtnRef.current = btn;
    setActiveQuote(quote);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setDragY(0);
    // Focus after React has committed the unmount, otherwise the
    // browser drops focus to <body> when the dialog is removed.
    const btn = lastSourceBtnRef.current;
    if (btn) requestAnimationFrame(() => btn.focus());
  };

  // Focus the close button when the sheet opens; lock body scroll.
  useEffect(() => {
    if (!sheetOpen) return;
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  // Escape closes the sheet; Tab stays inside it while open.
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  // Drag the sheet down to dismiss (touch gesture).
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 90) closeSheet();
    else setDragY(0);
    dragStartY.current = null;
  };

  const viewSourceLabel = uiLang === "id" ? "Lihat sumber di khotbah" : "View source in sermon";
  const closeLabel = uiLang === "id" ? "Tutup transkrip" : "Close transcript";
  const unverifiedNote =
    uiLang === "id"
      ? "Kutipan ini belum cocok dengan transkrip. Periksa sebelum dipakai."
      : "This quote does not match the transcript yet. Check before using it.";
  const audienceName =
    uiLang === "id"
      ? result.audience === "teens"
        ? "Remaja"
        : result.audience === "children"
          ? "Anak-anak (usia 6-11)"
          : "Dewasa"
      : result.audience === "teens"
        ? "Teens"
        : result.audience === "children"
          ? "Children (ages 6-11)"
          : "Adults";
  const isBeta = ["ru", "ja", "zh"].includes(result.outputLang);

  const sourceButtonProps = (quote: string, verified: boolean): SourceButtonProps => ({
    quote,
    verified,
    viewSourceLabel,
    sourceText: t.source,
    sourceUnverifiedText: t.sourceUnverified,
    onShow: showSource,
  });

  return (
    <div className="space-y-6" aria-live="polite">
      {result.demoMode && (
        <div className="card flex items-start gap-2 p-3 font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">
          <span className="mt-0.5 shrink-0 text-bulletin-olive dark:text-bulletin-oliveLight">
            <InfoIcon />
          </span>
          {t.demoBanner}
        </div>
      )}
      <p className="card flex items-center gap-2 p-3 font-sans text-xs font-semibold tracking-wide text-bulletin-muted dark:text-bulletin-mutedDark">
        <span className="text-bulletin-olive dark:text-bulletin-oliveLight">
          <InfoIcon />
        </span>
        {t.aiDraftLabel}
      </p>
      <p className="font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">
        {t.writtenFor}: {audienceName}
      </p>
      {isBeta && (
        <p className="font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">{t.betaNote}</p>
      )}

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="font-serif text-2xl font-semibold">
          {t.summaryTitle}
        </h2>
        <ul className="mt-3 space-y-3">
          {result.summary.map((s, i) => (
            <li key={i} className="card p-4">
              <p>{s.text}</p>
              <p className="mt-2 text-sm italic leading-relaxed text-bulletin-muted dark:text-bulletin-mutedDark">
                “{s.quote}”
                <SourceButton {...sourceButtonProps(s.quote, s.quoteVerified)} />
              </p>
              {!s.quoteVerified && (
                <p className="mt-2 flex items-start gap-1.5 font-sans text-xs leading-relaxed text-bulletin-brick dark:text-bulletin-brickLight">
                  <span className="mt-0.5 shrink-0">
                    <WarnIcon />
                  </span>
                  <span className="border-b border-dashed border-bulletin-brick dark:border-bulletin-brickLight">{unverifiedNote}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="questions-heading">
        <h2 id="questions-heading" className="font-serif text-2xl font-semibold">
          {t.questionsTitle}
        </h2>
        <ol className="mt-3 space-y-3">
          {result.questions.map((q, i) => (
            <li key={i} className="card p-4">
              <p>
                <span className="font-semibold">{i + 1}. </span>
                {q.text}
              </p>
              <p className="mt-2 text-sm italic leading-relaxed text-bulletin-muted dark:text-bulletin-mutedDark">
                “{q.quote}”
                <SourceButton {...sourceButtonProps(q.quote, q.quoteVerified)} />
              </p>
              {!q.quoteVerified && (
                <p className="mt-2 flex items-start gap-1.5 font-sans text-xs leading-relaxed text-bulletin-brick dark:text-bulletin-brickLight">
                  <span className="mt-0.5 shrink-0">
                    <WarnIcon />
                  </span>
                  <span className="border-b border-dashed border-bulletin-brick dark:border-bulletin-brickLight">{unverifiedNote}</span>
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="devotions-heading">
        <h2 id="devotions-heading" className="font-serif text-2xl font-semibold">
          {t.devotionsTitle}
        </h2>
        <div className="mt-3 space-y-3">
          {result.devotions.map((d, i) => (
            <div key={i} className="card p-4">
              <p className="font-sans text-sm font-semibold text-bulletin-olive dark:text-bulletin-oliveLight">{d.day}</p>
              <p className="mt-1">{d.text}</p>
              <p className="mt-2 text-sm italic text-bulletin-muted dark:text-bulletin-mutedDark">
                {t.prayer}: {d.prayer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {result.versesFlagged.length > 0 && (
        <section aria-labelledby="verses-heading" className="card border-l-4 border-l-bulletin-brick bg-bulletin-brickSoft p-4 dark:bg-bulletin-brickSoftDark">
          <h2 id="verses-heading" className="flex items-start gap-2 font-sans text-sm font-semibold text-bulletin-brick dark:text-bulletin-brickLight">
            <span className="mt-0.5 shrink-0">
              <WarnIcon />
            </span>
            {t.verseNotInSermon}
          </h2>
          <ul className="mt-2 list-inside list-disc font-sans text-sm text-bulletin-brick dark:text-bulletin-brickLight">
            {result.versesFlagged.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Transcript bottom sheet (Sermon Trace). */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50">
          <div aria-hidden="true" onClick={closeSheet} className="absolute inset-0 bg-black/40" />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sheet-title"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
            className="sheet-panel absolute inset-x-0 bottom-0 mx-auto max-h-[75vh] w-full max-w-bulletin overflow-y-auto rounded-t-3xl border-t-2 border-bulletin-gold bg-bulletin-card p-4 shadow-none dark:bg-bulletin-cardDark"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-bulletin-line dark:bg-bulletin-lineDark" aria-hidden="true" />
            <div className="mt-3 flex items-start justify-between gap-3">
              <h2 id="sheet-title" className="font-serif text-xl font-semibold">
                {t.transcriptPanel}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeSheet}
                aria-label={closeLabel}
                className="btn-small shrink-0 border border-bulletin-line text-bulletin-ink dark:border-bulletin-lineDark dark:text-bulletin-inkDark"
              >
                <CloseIcon />
                {uiLang === "id" ? "Tutup" : "Close"}
              </button>
            </div>
            <div className="mt-3 text-sm leading-relaxed text-bulletin-ink dark:text-bulletin-inkDark">
              {activeQuote !== null &&
                (highlightIndex >= 0 ? (
                  sentences.map((s, i) =>
                    i === highlightIndex ? (
                      <mark key={i}>{s} </mark>
                    ) : (
                      <span key={i}>{s} </span>
                    )
                  )
                ) : (
                  <p className="text-bulletin-muted dark:text-bulletin-mutedDark">{t.noTranscriptMatch}</p>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-bulletin-line bg-bulletin-bg px-4 pt-3 pb-safe dark:border-bulletin-lineDark dark:bg-bulletin-bgDark">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onDownloadTxt} className="btn-primary flex-1">
            <DownloadIcon />
            {t.downloadTxt}
          </button>
          <button type="button" onClick={onDownloadPdf} className="btn-secondary flex-1">
            <DownloadIcon />
            {t.downloadPdf}
          </button>
          <button type="button" onClick={onDownloadHandout} className="btn-ghost w-full">
            <DownloadIcon />
            {t.handout}
          </button>
        </div>
      </div>
    </div>
  );
}
