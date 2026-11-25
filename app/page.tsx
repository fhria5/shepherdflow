"use client";

import { useState } from "react";
import Link from "next/link";
import type { CareItem, Congregant, GenerateResult, OutputLang, Tone, Tradition, UiLang } from "@/lib/types";
import { SAMPLE_CONGREGANTS } from "@/lib/sample";
import { getStrings } from "@/lib/i18n";
import { downloadPdfFile, downloadTxtFile } from "@/lib/download";
import InputScreen from "@/app/components/InputScreen";
import ResultsScreen from "@/app/components/ResultsScreen";
import CareScreen from "@/app/components/CareScreen";

type Step = 1 | 2 | 3;

/** Thin-line cross, the single small symbol in the logo. Decorative. */
function CrossIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M7.5 8h9" />
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

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Home() {
  const [uiLang, setUiLang] = useState<UiLang>("en");
  const t = getStrings(uiLang);
  const [step, setStep] = useState<Step>(1);
  const [transcript, setTranscript] = useState("");
  const [tradition, setTradition] = useState<Tradition>("Protestant");
  const [tone, setTone] = useState<Tone>("warm");
  const [outputLang, setOutputLang] = useState<OutputLang>("en");
  const [congregants, setCongregants] = useState<Congregant[]>(SAMPLE_CONGREGANTS);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [care, setCare] = useState<CareItem[]>([]);
  const [aiNote, setAiNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = useState(false);

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  const generate = async () => {
    setError(null);
    if (wordCount === 0) return setError(t.errorEmpty);
    if (wordCount < 30) return setError(t.errorShort);
    if (wordCount > 8000) return setError(t.errorLong);
    const people = congregants.filter((c) => c.initials.trim().length > 0);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, tradition, tone, outputLang, congregants: people }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || t.errorApi);
      const r = data.result as GenerateResult;
      setResult(r);
      setCare(r.care);
      setStep(2);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errorApi);
    } finally {
      setLoading(false);
    }
  };

  const currentResult = (): GenerateResult | null => (result ? { ...result, care } : null);

  const doDownload = async (format: "txt" | "pdf", sections: "sermon" | "care" | "all") => {
    const r = currentResult();
    if (!r) return;
    const opts = { uiLang, sections, aiNote };
    try {
      if (format === "txt") await downloadTxtFile(r, opts);
      else await downloadPdfFile(r, opts);
      setDownloadMsg(true);
      setTimeout(() => setDownloadMsg(false), 6000);
    } catch {
      setError(t.errorApi);
    }
  };

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: t.step1 },
    { n: 2, label: t.step2 },
    { n: 3, label: t.step3 },
  ];

  return (
    <div className="mx-auto min-h-screen w-full max-w-bulletin px-4 pb-12 pt-6">
      <a href="#main-content" className="skip-link">
        {uiLang === "id" ? "Lewati ke konten utama" : "Skip to main content"}
      </a>

      <header>
        <div className="flex items-center justify-end gap-2" role="group" aria-label={uiLang === "id" ? "Bahasa antarmuka" : "Interface language"}>
          <button
            type="button"
            onClick={() => setUiLang("en")}
            aria-pressed={uiLang === "en"}
            className={`inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-full px-3 font-sans text-sm font-semibold ${
              uiLang === "en"
                ? "bg-bulletin-olive text-white dark:bg-bulletin-oliveLight dark:text-bulletin-bgDark"
                : "border border-bulletin-line bg-bulletin-card text-bulletin-muted dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-mutedDark"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setUiLang("id")}
            aria-pressed={uiLang === "id"}
            className={`inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-full px-3 font-sans text-sm font-semibold ${
              uiLang === "id"
                ? "bg-bulletin-olive text-white dark:bg-bulletin-oliveLight dark:text-bulletin-bgDark"
                : "border border-bulletin-line bg-bulletin-card text-bulletin-muted dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-mutedDark"
            }`}
          >
            ID
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-bulletin-olive dark:text-bulletin-oliveLight">
          <CrossIcon />
          <h1 className="font-serif text-3xl font-semibold leading-tight">ShepherdFlow</h1>
        </div>
        <p className="mt-1 font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">{t.tagline}</p>
        <p className="mt-2 flex items-center gap-1.5 font-sans text-xs font-medium text-bulletin-muted dark:text-bulletin-mutedDark">
          <InfoIcon />
          {t.aiDraftLabel}
        </p>
        <div className="mt-4 border-t-2 border-bulletin-gold" aria-hidden="true" />
      </header>

      <nav className="mt-5" aria-label={uiLang === "id" ? "Langkah" : "Steps"}>
        <ol className="flex border-b border-bulletin-line dark:border-bulletin-lineDark">
          {steps.map((s) => {
            const disabled = s.n > 1 && !result;
            const active = step === s.n;
            return (
              <li key={s.n} className="flex-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setStep(s.n)}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-0.5 border-b-[3px] px-1 py-2 font-sans text-xs font-semibold sm:text-sm ${
                    active
                      ? "border-bulletin-olive text-bulletin-ink dark:border-bulletin-oliveLight dark:text-bulletin-inkDark"
                      : disabled
                        ? "border-transparent text-bulletin-muted/50 dark:text-bulletin-mutedDark/50"
                        : "border-transparent text-bulletin-muted hover:text-bulletin-ink dark:text-bulletin-mutedDark dark:hover:text-bulletin-inkDark"
                  }`}
                >
                  <span aria-hidden="true">{s.n}</span>
                  <span>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {downloadMsg && (
        <div role="status" className="card mt-4 flex items-center gap-2 p-3 font-sans text-sm text-bulletin-ink dark:text-bulletin-inkDark">
          <span className="text-bulletin-olive dark:text-bulletin-oliveLight">
            <CheckIcon />
          </span>
          {t.downloadNote}
        </div>
      )}

      <main id="main-content" className="mt-6">
        {step === 1 && (
          <InputScreen
            t={t}
            uiLang={uiLang}
            transcript={transcript}
            setTranscript={setTranscript}
            tradition={tradition}
            setTradition={setTradition}
            tone={tone}
            setTone={setTone}
            outputLang={outputLang}
            setOutputLang={setOutputLang}
            congregants={congregants}
            setCongregants={setCongregants}
            onGenerate={generate}
            loading={loading}
            error={error}
          />
        )}
        {step === 2 && result && (
          <>
            <ResultsScreen
              t={t}
              uiLang={uiLang}
              result={currentResult()!}
              transcript={transcript}
              onDownloadTxt={() => doDownload("txt", "sermon")}
              onDownloadPdf={() => doDownload("pdf", "sermon")}
            />
            <div className="mt-6 flex justify-between gap-2">
              <button type="button" onClick={() => setStep(1)} className="btn-ghost">
                ← {t.back}
              </button>
              <button type="button" onClick={() => setStep(3)} className="btn-primary">
                {t.step3} →
              </button>
            </div>
          </>
        )}
        {step === 3 && result && (
          <>
            <CareScreen
              t={t}
              uiLang={uiLang}
              result={currentResult()!}
              care={care}
              setCare={setCare}
              aiNote={aiNote}
              setAiNote={setAiNote}
              onDownloadTxt={(s) => doDownload("txt", s)}
              onDownloadPdf={(s) => doDownload("pdf", s)}
            />
            <div className="mt-6">
              <button type="button" onClick={() => setStep(2)} className="btn-ghost">
                ← {t.back}
              </button>
            </div>
          </>
        )}
      </main>

      <footer className="mt-8 border-t border-bulletin-line pt-4 dark:border-bulletin-lineDark">
        <p className="flex items-center gap-1.5 font-sans text-xs font-medium text-bulletin-muted dark:text-bulletin-mutedDark">
          <InfoIcon />
          {t.aiDraftLabel}
        </p>
        <p className="mt-2 font-sans text-sm leading-relaxed text-bulletin-muted dark:text-bulletin-mutedDark">
          <Link href="/responsible-ai" className="inline-flex min-h-[2.75rem] items-center font-semibold text-bulletin-olive underline underline-offset-2 dark:text-bulletin-oliveLight">
            {t.responsibleAi}
          </Link>
          {" · "}
          {uiLang === "id"
            ? "Data jemaat tidak disimpan di server. Tidak ada pengiriman otomatis."
            : "Congregant data is never stored on the server. No automatic sending."}
        </p>
      </footer>
    </div>
  );
}
