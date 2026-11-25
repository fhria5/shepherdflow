import Link from "next/link";

const POINTS = [
  {
    n: 1,
    title: "Your data stays with you",
    body: "Congregant details are processed in your browser session only. Nothing is stored on our server, and there is no account or login. Downloads are created on your own device.",
  },
  {
    n: 2,
    title: "Nothing is sent automatically",
    body: "ShepherdFlow writes drafts, never messages. Every draft must be edited or approved by the pastor before it is copied and sent by a human.",
  },
  {
    n: 3,
    title: "The pastor always decides",
    body: "Every output is labelled “AI draft. Pastor review required.” The pastor reviews, edits, or discards anything the AI produces.",
  },
  {
    n: 4,
    title: "The AI knows when to step back",
    body: "People who are sick, grieving, or in crisis are never given an AI message draft. They are routed to personal contact — a call or a visit — and crisis notes carry a warning to involve the pastor and, if needed, a professional. ShepherdFlow never gives medical, legal, or psychological advice.",
  },
  {
    n: 5,
    title: "Sources are checked",
    body: "Every summary point and discussion question carries a quote from the sermon transcript. Quotes are verified against the transcript, and any Bible verse that does not appear in the sermon is flagged for the pastor to check.",
  },
];

export default function ResponsibleAiPage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-bulletin px-4 pb-12 pt-6">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <main id="main-content">
        <Link
          href="/"
          className="inline-flex min-h-[2.75rem] items-center rounded-xl px-3 font-sans text-sm font-semibold text-bulletin-olive underline underline-offset-2 dark:text-bulletin-oliveLight"
        >
          ← Back to ShepherdFlow
        </Link>
        <header className="mt-4">
          <h1 className="font-serif text-3xl font-semibold leading-tight">Responsible AI</h1>
          <p className="mt-2 text-bulletin-muted dark:text-bulletin-mutedDark">
            ShepherdFlow is built for small churches. It helps a pastor follow up a sermon — it never replaces the pastor.
          </p>
          <p className="mt-2 text-bulletin-muted dark:text-bulletin-mutedDark">
            Built for small churches everywhere, with limited staff and limited time.
          </p>
          <div className="mt-4 border-t-2 border-bulletin-gold" aria-hidden="true" />
        </header>
        <section aria-label="Five principles" className="mt-6 space-y-4">
          {POINTS.map((pt) => (
            <article key={pt.n} className="card p-4">
              <h2 className="font-serif text-xl font-semibold">
                <span className="mr-2 font-sans text-sm font-semibold text-bulletin-olive dark:text-bulletin-oliveLight" aria-hidden="true">
                  {pt.n}.
                </span>
                {pt.title}
              </h2>
              <p className="mt-1 leading-relaxed text-bulletin-ink dark:text-bulletin-inkDark">{pt.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
