"use client";

import type { Category, Congregant, OutputLang, Tone, Tradition } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { SAMPLE_CONGREGANTS, SAMPLE_SERMON } from "@/lib/sample";
import type { Strings } from "@/lib/i18n";

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
  congregants: Congregant[];
  setCongregants: (v: Congregant[]) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
}

const TRADITIONS: Tradition[] = ["Protestant", "Catholic", "Pentecostal/Charismatic", "Other"];
const CATEGORIES: Category[] = ["new", "absent", "sick", "grieving", "birthday", "other"];

export default function InputScreen(p: Props) {
  const words = p.transcript.trim().split(/\s+/).filter(Boolean).length;
  const overLimit = words > 8000;

  const addPerson = () => {
    const id = `c${Date.now()}`;
    p.setCongregants([...p.congregants, { id, initials: "", category: "new", note: "" }]);
  };
  const updatePerson = (id: string, patch: Partial<Congregant>) => {
    p.setCongregants(p.congregants.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-end justify-between">
          <label htmlFor="transcript" className="text-sm font-semibold text-stone-800">
            {p.t.transcriptLabel}
          </label>
          <span className={`text-xs ${overLimit ? "font-semibold text-red-600" : "text-stone-500"}`}>
            {words.toLocaleString()} {p.t.words} · {p.t.wordLimit}
          </span>
        </div>
        <textarea
          id="transcript"
          value={p.transcript}
          onChange={(e) => p.setTranscript(e.target.value)}
          placeholder={p.t.transcriptPlaceholder}
          rows={10}
          className="w-full rounded-xl border border-stone-300 bg-white p-3 leading-relaxed shadow-sm focus:border-shepherd-500 focus:outline-none focus:ring-2 focus:ring-shepherd-200"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => p.setTranscript(SAMPLE_SERMON)}
            className="rounded-full bg-shepherd-100 px-3 py-1.5 text-sm font-medium text-shepherd-800 hover:bg-shepherd-200"
          >
            {p.t.useSample}
          </button>
          <button
            type="button"
            onClick={() => p.setTranscript("")}
            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200"
          >
            {p.t.clear}
          </button>
          <button
            type="button"
            onClick={() => p.setCongregants(SAMPLE_CONGREGANTS)}
            className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-200"
          >
            {p.uiLang === "id" ? "Isi jemaat contoh" : "Load sample congregants"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-800">{p.t.tradition}</label>
          <select
            value={p.tradition}
            onChange={(e) => p.setTradition(e.target.value as Tradition)}
            className="w-full rounded-xl border border-stone-300 bg-white p-2.5 shadow-sm focus:border-shepherd-500 focus:outline-none"
          >
            {TRADITIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-800">{p.t.tone}</label>
          <select
            value={p.tone}
            onChange={(e) => p.setTone(e.target.value as Tone)}
            className="w-full rounded-xl border border-stone-300 bg-white p-2.5 shadow-sm focus:border-shepherd-500 focus:outline-none"
          >
            <option value="formal">{p.t.formal}</option>
            <option value="warm">{p.t.warm}</option>
            <option value="simple">{p.t.simple}</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-800">{p.t.outputLang}</label>
          <select
            value={p.outputLang}
            onChange={(e) => p.setOutputLang(e.target.value as OutputLang)}
            className="w-full rounded-xl border border-stone-300 bg-white p-2.5 shadow-sm focus:border-shepherd-500 focus:outline-none"
          >
            <option value="en">English</option>
            <option value="id">Bahasa Indonesia</option>
          </select>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-stone-800">{p.t.congregantsTitle}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{p.t.congregantsHint}</p>
        <div className="mt-2 space-y-2">
          {p.congregants.map((c) => (
            <div key={c.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <div className="flex gap-2">
                <input
                  value={c.initials}
                  onChange={(e) => updatePerson(c.id, { initials: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) })}
                  placeholder={p.t.initials}
                  aria-label={p.t.initials}
                  className="w-20 rounded-lg border border-stone-300 p-2 text-center font-semibold uppercase focus:border-shepherd-500 focus:outline-none"
                />
                <select
                  value={c.category}
                  onChange={(e) => updatePerson(c.id, { category: e.target.value as Category })}
                  aria-label={p.t.category}
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white p-2 focus:border-shepherd-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat][p.uiLang]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => p.setCongregants(p.congregants.filter((x) => x.id !== c.id))}
                  className="rounded-lg px-2 text-sm text-red-600 hover:bg-red-50"
                >
                  {p.t.remove}
                </button>
              </div>
              <input
                value={c.note}
                onChange={(e) => updatePerson(c.id, { note: e.target.value })}
                placeholder={p.t.note}
                aria-label={p.t.note}
                className="mt-2 w-full rounded-lg border border-stone-300 p-2 focus:border-shepherd-500 focus:outline-none"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPerson}
          className="mt-2 rounded-full border border-shepherd-500 px-3 py-1.5 text-sm font-medium text-shepherd-700 hover:bg-shepherd-100"
        >
          {p.t.addPerson}
        </button>
      </div>

      {p.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{p.error}</p>
          <button
            type="button"
            onClick={p.onGenerate}
            disabled={p.loading}
            className="mt-2 rounded-full bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {p.t.retry}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={p.onGenerate}
        disabled={p.loading || overLimit}
        className="w-full rounded-xl bg-shepherd-600 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-shepherd-700 disabled:opacity-50"
      >
        {p.loading ? p.t.generating : p.t.generate}
      </button>
      {p.loading && <p className="text-center text-sm text-stone-500">{p.t.loading}</p>}
    </div>
  );
}
