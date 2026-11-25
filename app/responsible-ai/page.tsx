import Link from "next/link";

export default function ResponsibleAiPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm font-medium text-shepherd-700 underline">
        ← Back to ShepherdFlow
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-bold text-stone-900">Responsible AI</h1>
      <p className="mt-2 text-stone-600">
        ShepherdFlow is built for small churches. It helps a pastor follow up a sermon — it never
        replaces the pastor.
      </p>
      <section className="mt-6 space-y-4 text-[15px] leading-relaxed text-stone-700">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">1. Your data stays with you</h2>
          <p>
            Congregant details are processed in your browser session only. Nothing is stored on
            our server, and there is no account or login. Downloads are created on your own
            device.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">2. Nothing is sent automatically</h2>
          <p>
            ShepherdFlow writes drafts, never messages. Every draft must be edited or approved by
            the pastor before it is copied and sent by a human.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">3. The pastor always decides</h2>
          <p>
            Every output is labelled “AI draft. Pastor review required.” The pastor reviews,
            edits, or discards anything the AI produces.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">4. The AI knows when to step back</h2>
          <p>
            People who are sick, grieving, or in crisis are never given an AI message draft.
            They are routed to personal contact — a call or a visit — and crisis notes carry a
            warning to involve the pastor and, if needed, a professional. ShepherdFlow never
            gives medical, legal, or psychological advice.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold text-stone-900">5. Sources are checked</h2>
          <p>
            Every summary point and discussion question carries a quote from the sermon
            transcript. Quotes are verified against the transcript, and any Bible verse that does
            not appear in the sermon is flagged for the pastor to check.
          </p>
        </div>
      </section>
    </main>
  );
}
