"use client";

import { useEffect, useRef, useState } from "react";
import type { Audience, Category, Congregant, OutputLang, Tone, Tradition } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { OUTPUT_LANGUAGES, countUnits, isCharCountLang, maxUnits } from "@/lib/languages";
import { SAMPLE_CONGREGANTS, SAMPLE_SERMON } from "@/lib/sample";
import type { Strings } from "@/lib/i18n";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface Props {
  t: Strings;
  uiLang: "en" | "id";
  transcript: string;
  setTranscript: (v: string) => void;
  tradition: Tradition;
  setTradition: (v: Tradition) => void;
  tone: Tone;
  setTone: (v: Tone) => void;
  outputLang: OutputLang;
  setOutputLang: (v: OutputLang) => void;
  audience: Audience;
  setAudience: (v: Audience) => void;
  congregants: Congregant[];
  setCongregants: (v: Congregant[]) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
}

const TRADITIONS: Tradition[] = [
  "Protestant",
  "Catholic",
  "Orthodox",
  "Pentecostal/Charismatic",
  "Evangelical",
  "Anglican/Lutheran",
  "Other",
];
const CATEGORIES: Category[] = ["new", "absent", "sick", "grieving", "birthday", "other"];
const OUTPUT_LANG_CODES = Object.keys(OUTPUT_LANGUAGES) as OutputLang[];

export default function InputScreen(p: Props) {
  const units = countUnits(p.transcript, p.outputLang);
  const charLang = isCharCountLang(p.outputLang);
  const overLimit = units > maxUnits(p.outputLang);
  const hasError = p.error !== null;
  const isBeta = OUTPUT_LANGUAGES[p.outputLang].beta;

  // Voice dictation (Web Speech API). Not all browsers support it;
  // the button reports that plainly instead of failing silently.
  const [dictating, setDictating] = useState(false);
  const [dictateMsg, setDictateMsg] = useState<string | null>(null);
  const [dictateLang, setDictateLang] = useState(OUTPUT_LANGUAGES[p.outputLang].speechLocale);
  const recogRef = useRef<{ stop: () => void } | null>(null);

  // Follow the output language unless the pastor picked another one.
  useEffect(() => {
    setDictateLang(OUTPUT_LANGUAGES[p.outputLang].speechLocale);
  }, [p.outputLang]);

  const toggleDictation = () => {
    if (dictating) {
      recogRef.current?.stop();
      setDictating(false);
      return;
    }
    const SR =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SR) {
      setDictateMsg(p.t.dictateUnsupported);
      return;
    }
    try {
      const rec = new SR();
      recogRef.current = rec;
      rec.lang = dictateLang;
      rec.interimResults = true;
      rec.continuous = true;
      const base = p.transcript;
      let finals = "";
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const part = event.results[i][0].transcript;
          if (event.results[i].isFinal) finals += part;
          else interim += part;
        }
        p.setTranscript([base, finals, interim].filter(Boolean).join(" "));
      };
      rec.onerror = () => {
        setDictating(false);
        setDictateMsg(p.t.dictateError);
      };
      rec.onend = () => setDictating(false);
      rec.start();
      setDictating(true);
      setDictateMsg(null);
    } catch {
      setDictateMsg(p.t.dictateError);
    }
  };

  const addPerson = () => {
    const id = `c${Date.now()}`;
    p.setCongregants([...p.congregants, { id, initials: "", category: "new", note: "" }]);
  };
  const updatePerson = (id: string, patch: Partial<Congregant>) => {
    p.setCongregants(p.congregants.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="transcript-heading">
        <h2 id="transcript-heading" className="sr-only">
          {p.t.transcriptLabel}
        </h2>
        <div className="mb-1 flex items-end justify-between gap-2">
          <label htmlFor="transcript" className="field-label mb-0">
            {p.t.transcriptLabel}
          </label>
          <span
            className={`font-sans text-xs ${overLimit ? "font-semibold text-bulletin-brick dark:text-bulletin-brickLight" : "text-bulletin-muted dark:text-bulletin-mutedDark"}`}
          >
            {units.toLocaleString()} {charLang ? p.t.characters : p.t.words} · {charLang ? p.t.charLimit : p.t.wordLimit}
          </span>
        </div>
        <textarea
          id="transcript"
          value={p.transcript}
          onChange={(e) => p.setTranscript(e.target.value)}
          placeholder={p.t.transcriptPlaceholder}
          rows={10}
          aria-invalid={hasError}
          aria-describedby={hasError ? "transcript-error" : "transcript-hint"}
          className="field min-h-[12rem] leading-relaxed"
        />
        <p id="transcript-hint" className="field-hint">
          {p.uiLang === "id"
            ? "Tempel atau ketik khotbah lengkap. Tidak ada yang diunggah atau disimpan."
            : "Paste or type the full sermon. Nothing is uploaded or stored."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => p.setTranscript(SAMPLE_SERMON)}
            className="btn-small border border-bulletin-line bg-bulletin-badgeTint text-bulletin-oliveDeep hover:bg-bulletin-badgeTint dark:border-bulletin-lineDark dark:bg-bulletin-badgeTintDark dark:text-bulletin-oliveLight"
          >
            {p.t.useSample}
          </button>
          <button
            type="button"
            onClick={() => p.setTranscript("")}
            className="btn-small border border-bulletin-line bg-bulletin-card text-bulletin-muted hover:bg-bulletin-bg dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-mutedDark dark:hover:bg-bulletin-cardDark"
          >
            {p.t.clear}
          </button>
          <button
            type="button"
            onClick={() => p.setCongregants(SAMPLE_CONGREGANTS)}
            className="btn-small border border-bulletin-line bg-bulletin-card text-bulletin-muted hover:bg-bulletin-bg dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-mutedDark dark:hover:bg-bulletin-cardDark"
          >
            {p.uiLang === "id" ? "Isi jemaat contoh" : "Load sample congregants"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={toggleDictation}
            aria-pressed={dictating}
            className={`btn-small border ${
              dictating
                ? "border-bulletin-brick bg-bulletin-brickSoft text-bulletin-brick dark:border-bulletin-brickLight dark:bg-bulletin-brickSoftDark dark:text-bulletin-brickLight"
                : "border-bulletin-line bg-bulletin-card text-bulletin-ink hover:bg-bulletin-bg dark:border-bulletin-lineDark dark:bg-transparent dark:text-bulletin-inkDark dark:hover:bg-bulletin-cardDark"
            }`}
          >
            {dictating ? p.t.dictating : p.t.dictate}
          </button>
          <div>
            <label htmlFor="dictate-lang" className="field-label">
              {p.t.dictateLang}
            </label>
            <select
              id="dictate-lang"
              value={dictateLang}
              onChange={(e) => setDictateLang(e.target.value)}
              className="field w-auto"
            >
              {OUTPUT_LANG_CODES.map((code) => (
                <option key={code} value={OUTPUT_LANGUAGES[code].speechLocale}>
                  {OUTPUT_LANGUAGES[code].nativeName} ({OUTPUT_LANGUAGES[code].speechLocale})
                </option>
              ))}
            </select>
          </div>
        </div>
        {dictateMsg && (
          <p role="status" className="mt-2 font-sans text-xs leading-relaxed text-bulletin-muted dark:text-bulletin-mutedDark">
            {dictateMsg}
          </p>
        )}
      </section>

      <section aria-label={p.uiLang === "id" ? "Pengaturan khotbah" : "Sermon settings"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tradition" className="field-label">
              {p.t.tradition}
            </label>
            <select
              id="tradition"
              value={p.tradition}
              onChange={(e) => p.setTradition(e.target.value as Tradition)}
              className="field"
            >
              {TRADITIONS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <p className="field-hint">{p.t.traditionNote}</p>
          </div>
          <div>
            <label htmlFor="tone" className="field-label">
              {p.t.tone}
            </label>
            <select id="tone" value={p.tone} onChange={(e) => p.setTone(e.target.value as Tone)} className="field">
              <option value="formal">{p.t.formal}</option>
              <option value="warm">{p.t.warm}</option>
              <option value="simple">{p.t.simple}</option>
            </select>
          </div>
          <div>
            <label htmlFor="output-lang" className="field-label">
              {p.t.outputLang}
            </label>
            <select
              id="output-lang"
              value={p.outputLang}
              onChange={(e) => p.setOutputLang(e.target.value as OutputLang)}
              className="field"
            >
              {OUTPUT_LANG_CODES.map((code) => (
                <option key={code} value={code}>
                  {OUTPUT_LANGUAGES[code].nativeName}
                  {OUTPUT_LANGUAGES[code].beta ? ` (${p.t.betaTag})` : ""}
                </option>
              ))}
            </select>
            {isBeta && <p className="field-hint">{p.t.betaNote}</p>}
          </div>
          <div>
            <label htmlFor="audience" className="field-label">
              {p.t.audience}
            </label>
            <select
              id="audience"
              value={p.audience}
              onChange={(e) => p.setAudience(e.target.value as Audience)}
              className="field"
            >
              <option value="adults">{p.t.audienceAdults}</option>
              <option value="teens">{p.t.audienceTeens}</option>
              <option value="children">{p.t.audienceChildren}</option>
            </select>
          </div>
        </div>
      </section>

      <section aria-labelledby="congregants-heading">
        <h2 id="congregants-heading" className="font-sans text-sm font-semibold text-bulletin-ink dark:text-bulletin-inkDark">
          {p.t.congregantsTitle}
        </h2>
        <p className="mt-1 font-sans text-xs leading-relaxed text-bulletin-muted dark:text-bulletin-mutedDark">{p.t.congregantsHint}</p>
        <ul className="mt-3 space-y-3">
          {p.congregants.map((c, idx) => (
            <li key={c.id} className="card p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label htmlFor={`initials-${c.id}`} className="field-label">
                    {p.t.initials}
                  </label>
                  <input
                    id={`initials-${c.id}`}
                    value={c.initials}
                    onChange={(e) => updatePerson(c.id, { initials: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) })}
                    placeholder={p.uiLang === "id" ? "Contoh: R.S." : "E.g. R.S."}
                    className="field w-24 text-center font-semibold uppercase"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`category-${c.id}`} className="field-label">
                    {p.t.category}
                  </label>
                  <select
                    id={`category-${c.id}`}
                    value={c.category}
                    onChange={(e) => updatePerson(c.id, { category: e.target.value as Category })}
                    className="field"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat][p.uiLang]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => p.setCongregants(p.congregants.filter((x) => x.id !== c.id))}
                  aria-label={
                    p.uiLang === "id"
                      ? `Hapus jemaat ${c.initials || idx + 1}`
                      : `Remove congregant ${c.initials || idx + 1}`
                  }
                  className="btn-small text-bulletin-brick hover:bg-bulletin-brickSoft dark:text-bulletin-brickLight dark:hover:bg-bulletin-brickSoftDark"
                >
                  {p.t.remove}
                </button>
              </div>
              <div className="mt-3">
                <label htmlFor={`note-${c.id}`} className="field-label">
                  {p.t.note}
                </label>
                <input
                  id={`note-${c.id}`}
                  value={c.note}
                  onChange={(e) => updatePerson(c.id, { note: e.target.value })}
                  placeholder={p.t.note}
                  className="field"
                />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={addPerson} className="btn-secondary mt-3">
          {p.t.addPerson}
        </button>
      </section>

      {p.error && (
        <div id="transcript-error" role="alert" className="card border-l-4 border-l-bulletin-brick bg-bulletin-brickSoft p-4 dark:bg-bulletin-brickSoftDark">
          <p className="font-sans text-sm font-medium text-bulletin-brick dark:text-bulletin-brickLight">{p.error}</p>
          <button type="button" onClick={p.onGenerate} disabled={p.loading} className="btn-primary mt-3 disabled:opacity-50">
            {p.t.retry}
          </button>
        </div>
      )}

      <div>
        <button type="button" onClick={p.onGenerate} disabled={p.loading || overLimit} className="btn-primary w-full text-base disabled:opacity-50">
          {p.loading ? p.t.generating : p.t.generate}
        </button>
        {p.loading && (
          <p role="status" aria-live="polite" className="mt-3 text-center font-sans text-sm text-bulletin-muted dark:text-bulletin-mutedDark">
            {p.t.loading}
          </p>
        )}
      </div>
    </div>
  );
}
