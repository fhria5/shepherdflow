"use client";

import { useMemo, useRef, useState } from "react";
import type { GenerateResult } from "@/lib/types";
import { normalizeText } from "@/lib/validate";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  result: GenerateResult;
  transcript: string;
  onDownloadTxt: () => void;
  onDownloadPdf: () => void;
}

function sentenceList(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export default function ResultsScreen({ t, result, transcript, onDownloadTxt, onDownloadPdf }: Props) {
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sentences = useMemo(() => sentenceList(transcript), [transcript]);

  const highlightIndex = useMemo(() => {
    if (!activeQuote) return -1;
    const q = normalizeText(activeQuote);
    return sentences.findIndex((s) => {
      const n = normalizeText(s);
      return n.includes(q) || q.includes(n.slice(0, 120));
    });
  }, [activeQuote, sentences]);

  const showSource = (quote: string) => {
    setActiveQuote(quote);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const SourceButton = ({ quote, verified }: { quote: string; verified: boolean }) => (
    <button
      type="button"
      onClick={() => showSource(quote)}
      title={t.source}
      className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        verified ? "bg-shepherd-100 text-shepherd-800 hover:bg-shepherd-200" : "bg-yellow-100 text-yellow-800"
      }`}
    >
      📖 {verified ? t.source : t.sourceUnverified}
    </button>
  );

  return (
    <div className="space-y-6">
      {result.demoMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{t.demoBanner}</div>
      )}
      <div className="rounded-xl border border-stone-200 bg-white p-3 text-center text-xs font-semibold tracking-wide text-stone-500">
        {t.aiDraftLabel}
      </div>

      <section>
        <h2 className="font-serif text-xl font-bold text-stone-900">{t.summaryTitle}</h2>
        <ul className="mt-2 space-y-2">
          {result.summary.map((s, i) => (
            <li key={i} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <p className="text-[15px] leading-relaxed">{s.text}</p>
              <p className="mt-1.5 text-xs italic leading-relaxed text-stone-500">
                “{s.quote}”
                <SourceButton quote={s.quote} verified={s.quoteVerified} />
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold text-stone-900">{t.questionsTitle}</h2>
        <ol className="mt-2 space-y-2">
          {result.questions.map((q, i) => (
            <li key={i} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <p className="text-[15px] leading-relaxed">
                <span className="font-semibold">{i + 1}. </span>
                {q.text}
              </p>
              <p className="mt-1.5 text-xs italic leading-relaxed text-stone-500">
                “{q.quote}”
                <SourceButton quote={q.quote} verified={q.quoteVerified} />
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif text-xl font-bold text-stone-900">{t.devotionsTitle}</h2>
        <div className="mt-2 space-y-2">
          {result.devotions.map((d, i) => (
            <div key={i} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-shepherd-700">{d.day}</p>
              <p className="mt-1 text-[15px] leading-relaxed">{d.text}</p>
              <p className="mt-1.5 text-sm italic text-stone-600">
                {t.prayer}: {d.prayer}
              </p>
            </div>
          ))}
        </div>
      </section>

      {result.versesFlagged.length > 0 && (
        <section className="rounded-xl border border-yellow-300 bg-yellow-50 p-3">
          <h2 className="text-sm font-semibold text-yellow-800">⚠ {t.verseNotInSermon}</h2>
          <ul className="mt-1 list-inside list-disc text-sm text-yellow-800">
            {result.versesFlagged.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </section>
      )}

      <section ref={panelRef}>
        <h2 className="text-sm font-semibold text-stone-800">{t.transcriptPanel}</h2>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-700 shadow-sm">
          {activeQuote === null && <p className="text-stone-400">{t.transcriptPanel}</p>}
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
              <p className="text-stone-500">{t.noTranscriptMatch}</p>
            ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDownloadTxt} className="rounded-xl bg-shepherd-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-shepherd-700">
          {t.downloadTxt}
        </button>
        <button type="button" onClick={onDownloadPdf} className="rounded-xl border border-shepherd-600 px-4 py-2.5 text-sm font-semibold text-shepherd-700 hover:bg-shepherd-100">
          {t.downloadPdf}
        </button>
      </div>
    </div>
  );
}
