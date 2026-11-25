"use client";

import { useState } from "react";
import type { CareItem, GenerateResult, UiLang } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

interface Props {
  t: Strings;
  uiLang: UiLang;
  result: GenerateResult;
  care: CareItem[];
  setCare: (v: CareItem[]) => void;
  aiNote: boolean;
  setAiNote: (v: boolean) => void;
  onDownloadTxt: (sections: "care" | "all") => void;
  onDownloadPdf: (sections: "care" | "all") => void;
}

export default function CareScreen(p: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const update = (initials: string, patch: Partial<CareItem>) => {
    p.setCare(p.care.map((c) => (c.initials === initials ? { ...c, ...patch } : c)));
  };

  const copyDraft = async (c: CareItem) => {
    if (!c.draft) return;
    try {
      await navigator.clipboard.writeText(c.draft);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = c.draft;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedId(c.initials);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {p.result.demoMode && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{p.t.demoBanner}</div>
      )}
      <div className="rounded-xl border border-stone-200 bg-white p-3 text-center text-xs font-semibold tracking-wide text-stone-500">
        {p.t.aiDraftLabel}
      </div>

      <h2 className="font-serif text-xl font-bold text-stone-900">{p.t.careTitle}</h2>

      {p.care.map((c) => (
        <div key={c.initials} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-lg font-bold text-stone-900">{c.initials}</span>
              <span className="ml-2 text-sm text-stone-500">{CATEGORY_LABELS[c.category][p.uiLang]}</span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                c.action === "visit" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"
              }`}
            >
              {c.action === "visit" ? p.t.visit : p.t.sendMessage}
            </span>
          </div>

          {c.crisis && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm font-medium text-red-700">
              ⚠ {p.t.crisisWarning}
            </div>
          )}

          <p className="mt-2 text-sm leading-relaxed text-stone-700">
            <span className="font-semibold">{p.t.suggestion}: </span>
            {c.suggestion}
          </p>

          {c.action === "message" && c.draft && (
            <div className="mt-3 rounded-lg bg-shepherd-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{p.t.draft}</p>
              {editingId === c.initials ? (
                <>
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white p-2 text-[15px] leading-relaxed focus:border-shepherd-500 focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        update(c.initials, { draft: editText, draftEdited: true, draftApproved: false });
                        setEditingId(null);
                      }}
                      className="rounded-lg bg-shepherd-600 px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      {p.t.saveEdit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-600"
                    >
                      {p.t.cancel}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-stone-800">{c.draft}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.initials);
                        setEditText(c.draft || "");
                      }}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700"
                    >
                      {p.t.edit}
                    </button>
                    <button
                      type="button"
                      onClick={() => update(c.initials, { draftApproved: true })}
                      disabled={c.draftApproved}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                        c.draftApproved ? "bg-green-100 text-green-800" : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {c.draftApproved ? `✓ ${p.t.approved}` : p.t.approve}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyDraft(c)}
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700"
                    >
                      {copiedId === c.initials ? `✓ ${p.t.copied}` : p.t.copy}
                    </button>
                    {!c.draftApproved && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                        {p.t.notApproved}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {c.action === "visit" && (
            <p className="mt-2 text-xs italic text-stone-500">
              {p.uiLang === "id"
                ? "Tidak ada draf pesan AI untuk orang ini — hubungi langsung."
                : "No AI message draft for this person — contact them in person."}
            </p>
          )}
        </div>
      ))}

      <label className="flex items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm shadow-sm">
        <input
          type="checkbox"
          checked={p.aiNote}
          onChange={(e) => p.setAiNote(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-shepherd-600"
        />
        <span>{p.t.aiNoteToggle}</span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => p.onDownloadTxt("care")} className="rounded-xl bg-shepherd-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-shepherd-700">
          {p.t.downloadTxt}
        </button>
        <button type="button" onClick={() => p.onDownloadPdf("care")} className="rounded-xl border border-shepherd-600 px-4 py-2.5 text-sm font-semibold text-shepherd-700 hover:bg-shepherd-100">
          {p.t.downloadPdf}
        </button>
        <button type="button" onClick={() => p.onDownloadTxt("all")} className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-900">
          {p.t.downloadAllTxt}
        </button>
        <button type="button" onClick={() => p.onDownloadPdf("all")} className="rounded-xl border border-stone-800 px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100">
          {p.t.downloadAllPdf}
        </button>
      </div>
    </div>
  );
}
