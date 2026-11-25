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
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pb-12 pt-6">
      <header className="text-center">
        <div className="flex items-center justify-end gap-1 text-sm">
          <button
            type="button"
            onClick={() => setUiLang("en")}
            className={`rounded-full px-3 py-1 font-semibold ${uiLang === "en" ? "bg-shepherd-600 text-white" : "bg-white text-stone-600 border border-stone-300"}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setUiLang("id")}
            className={`rounded-full px-3 py-1 font-semibold ${uiLang === "id" ? "bg-shepherd-600 text-white" : "bg-white text-stone-600 border border-stone-300"}`}
          >
            ID
          </button>
        </div>
        <h1 className="mt-2 font-serif text-4xl font-bold text-stone-900">ShepherdFlow</h1>
        <p className="mt-1 text-[15px] text-stone-600">{t.tagline}</p>
      </header>

      <nav className="mt-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm" aria-label="Steps">
        {steps.map((s) => {
          const disabled = s.n > 1 && !result;
          const active = step === s.n;
          return (
            <button
              key={s.n}
              type="button"
              disabled={disabled}
              onClick={() => setStep(s.n)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold sm:text-sm ${
                active ? "bg-shepherd-600 text-white" : disabled ? "text-stone-300" : "text-stone-600 hover:bg-shepherd-100"
              }`}
            >
              {s.n}. {s.label}
            </button>
          );
        })}
      </nav>

      {downloadMsg && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-center text-sm text-green-800">
          ✓ {t.downloadNote}
        </div>
      )}

      <div className="mt-5">
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
              result={currentResult()!}
              transcript={transcript}
              onDownloadTxt={() => doDownload("txt", "sermon")}
              onDownloadPdf={() => doDownload("pdf", "sermon")}
            />
            <div className="mt-4 flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
                ← {t.back}
              </button>
              <button type="button" onClick={() => setStep(3)} className="rounded-xl bg-shepherd-600 px-4 py-2.5 text-sm font-semibold text-white">
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
            <div className="mt-4">
              <button type="button" onClick={() => setStep(2)} className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700">
                ← {t.back}
              </button>
            </div>
          </>
        )}
      </div>

      <footer className="mt-8 border-t border-stone-200 pt-4 text-center text-xs leading-relaxed text-stone-500">
        <p>{t.aiDraftLabel}</p>
        <p className="mt-1">
          <Link href="/responsible-ai" className="font-medium text-shepherd-700 underline">
            {t.responsibleAi}
          </Link>
          {" · "}
          {uiLang === "id"
            ? "Data jemaat tidak disimpan di server. Tidak ada pengiriman otomatis."
            : "Congregant data is never stored on the server. No automatic sending."}
        </p>
      </footer>
    </main>
  );
}
