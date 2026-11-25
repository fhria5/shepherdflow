import type { Congregant, GenerateResult, OutputLang, Tone } from "./types";
import { DAYS_EN, DAYS_ID } from "./types";
import { enforceTriage } from "./triage";
import { extractVerses, flagVersesNotInTranscript, quoteExistsInTranscript } from "./validate";

export const SAMPLE_SERMON = `Love That Serves

Good morning, church family. Today I want to talk about something simple, and something hard: love that serves.

Jesus said in John 13:34-35, "A new command I give you: Love one another. As I have loved you, so you must love one another. By this everyone will know that you are my disciples, if you love one another." He does not point to our answers or our building. He points to our love. Love is the mark of a disciple.

But what kind of love is this? It is not a feeling that comes and goes. It is love that serves. In Mark 10:45, Jesus tells us that He "did not come to be served, but to serve, and to give his life as a ransom for many." The King of heaven washed feet. The Lord of all picked up a towel. If Jesus served like that, then serving is not below us. Serving is what love looks like when it puts on work clothes.

The apostle John makes it very practical. In 1 John 3:18 he writes, "Dear children, let us not love with words or speech but with actions and in truth." It is easy to say "I love you" on a Sunday morning. It is harder to love with actions on a Monday afternoon. Real love shows up. It brings a meal. It makes a phone call. It sits beside someone in a hospital waiting room. It remembers a birthday. It notices the person who has not been here for three weeks and asks, "Are you okay?"

Paul says the same thing in Galatians 5:13: "Serve one another humbly in love." Humility is the key. Serving is not about being noticed. It is about quietly doing the next small thing for the person in front of you.

And Jesus gives us a beautiful promise in Matthew 25:40: "Whatever you did for one of the least of these brothers and sisters of mine, you did for me." When you serve the lonely, the sick, the new family who just walked through our doors, you are serving Jesus Himself.

So this week, I want to challenge all of us with one question: who is one person you can serve? Not ten people. Just one. One phone call. One visit. One meal. One prayer. Love that serves does not need a big stage. It needs a willing heart.

Let us be a church that loves like Jesus loved and serves like Jesus served. Amen.`;

export const SAMPLE_CONGREGANTS: Congregant[] = [
  { id: "c1", initials: "AK", category: "new", note: "Joined us for the first time last Sunday and asked about small groups." },
  { id: "c2", initials: "MR", category: "absent", note: "Has not been to church for three Sundays; usually sits near the front." },
  { id: "c3", initials: "SL", category: "sick", note: "Recovering from surgery at home and cannot come to church this month." },
  { id: "c4", initials: "JT", category: "grieving", note: "Lost her husband two weeks ago; the family is grieving together." },
  { id: "c5", initials: "DP", category: "birthday", note: "Turns 70 on Thursday and has served in the kitchen team for years." },
  { id: "c6", initials: "NB", category: "other", note: "Mentioned feeling hopeless and thoughts of self-harm — needs urgent care." },
];

function sentencesOf(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

function shortQuote(sentence: string, maxWords = 25): string {
  const words = sentence.split(/\s+/);
  if (words.length <= maxWords) return sentence;
  return words.slice(0, maxWords).join(" ") + "…";
}

const QUESTION_TEMPLATES: Record<OutputLang, string[]> = {
  en: [
    "What does love that serves look like in your everyday life this week?",
    "Jesus washed feet and picked up a towel. What is one small act of service you can do for someone near you?",
    "Why do you think Jesus said people will know we are His disciples by our love, not by our words?",
    "Who is one person in our church or neighbourhood who may feel unseen right now, and how could we reach out?",
    "What holds you back from serving humbly, and what would help you take one small step this week?",
  ],
  id: [
    "Seperti apa kasih yang melayani dalam kehidupanmu sehari-hari minggu ini?",
    "Yesus membasuh kaki dan mengambil handuk. Apa satu tindakan pelayanan kecil yang bisa kamu lakukan untuk orang di dekatmu?",
    "Menurutmu mengapa Yesus berkata orang akan tahu kita murid-Nya dari kasih kita, bukan dari kata-kata kita?",
    "Siapa satu orang di gereja atau lingkungan kita yang mungkin merasa tidak diperhatikan saat ini, dan bagaimana kita bisa menjangkaunya?",
    "Apa yang menahanmu untuk melayani dengan rendah hati, dan apa yang bisa membantumu mengambil satu langkah kecil minggu ini?",
  ],
};

function draftFor(person: Congregant, tone: Tone, lang: OutputLang): string {
  const warm = tone !== "formal";
  if (lang === "id") {
    if (person.category === "new")
      return "Hai, senang sekali kamu datang hari Minggu lalu. Kalau kamu mau tahu tentang small group, kami dengan senang hati membantumu menemukan yang cocok. Kasih yang melayani dimulai dari saling mengenal.";
    if (person.category === "absent")
      return "Hai, kami merindukanmu di gereja beberapa minggu ini. Semoga kamu baik-baik saja. Kalau ada yang bisa kami bantu atau doakan, kabari kami ya.";
    if (person.category === "birthday")
      return "Hai, selamat ulang tahun yang ke-70! Terima kasih atas pelayananmu selama ini di tim dapur. Kami bersyukur atas hidupmu dan mendoakanmu di hari istimewamu.";
    return "Hai, kami memikirkanmu minggu ini. Khotbah hari Minggu mengingatkan kami bahwa kasih itu melayani dengan tindakan kecil. Kalau ada yang bisa kami bantu, beri tahu kami ya.";
  }
  if (person.category === "new")
    return "Hi, it was so good to meet you last Sunday. If you would like to know more about our small groups, we would love to help you find one that fits. Love that serves starts with getting to know one another.";
  if (person.category === "absent")
    return "Hi, we have missed you at church these past few weeks. We hope you are doing well. If there is anything we can help with or pray about, please let us know.";
  if (person.category === "birthday")
    return "Hi, happy 70th birthday! Thank you for all your years of service on the kitchen team. We are grateful for you and we are praying for you on your special day.";
  return warm
    ? "Hi, we have been thinking of you this week. Sunday's sermon reminded us that love serves in small, practical ways. If there is anything we can help with, please let us know."
    : "Hello. We have been thinking of you this week. Our sermon on Sunday reminded us that love is shown through small acts of service. Please let us know if we can help in any way.";
}

function suggestionFor(person: Congregant, lang: OutputLang, crisis: boolean): string {
  if (crisis)
    return lang === "id"
      ? "Hubungi hari ini. Dengarkan lebih dulu, jangan menasihati sendiri — libatkan pastor dan, bila perlu, seorang profesional."
      : "Contact today. Listen first, do not counsel alone — involve the pastor and, if needed, a professional.";
  if (person.category === "sick")
    return lang === "id"
      ? "Telepon hari ini, dengarkan lebih dulu, dan tawarkan kunjungan minggu ini."
      : "Call today, listen first, and offer a visit this week.";
  if (person.category === "grieving")
    return lang === "id"
      ? "Telepon hari ini, dengarkan lebih dulu, dan tawarkan kehadiran — bukan nasihat."
      : "Call today, listen first, and offer your presence — not advice.";
  return lang === "id"
    ? "Kirim pesan hangat minggu ini."
    : "Send a warm, short message this week.";
}

/**
 * Demo-mode generator: fully local, extractive, deterministic.
 * Summary points and questions quote VERBATIM sentences from the transcript,
 * so sermon-trace validation always passes. Care triage goes through the
 * same hard-rule enforcement as the live AI path.
 */
export function generateDemoResult(
  transcript: string,
  tone: Tone,
  outputLang: OutputLang,
  congregants: Congregant[]
): GenerateResult {
  const lang = outputLang;
  const sentences = sentencesOf(transcript);
  const picks = [0, 1, 2, 3].map((i) => sentences[Math.min(i, sentences.length - 1)]).filter(Boolean);
  const summary = picks.slice(0, 4).map((s) => ({
    text: s,
    quote: shortQuote(s),
    quoteVerified: quoteExistsInTranscript(shortQuote(s), transcript),
  }));

  const questions = QUESTION_TEMPLATES[lang].map((q, i) => {
    const quoteSrc = sentences[(i * 2 + 1) % sentences.length] || sentences[0];
    const quote = shortQuote(quoteSrc);
    return { text: q, quote, quoteVerified: quoteExistsInTranscript(quote, transcript) };
  });

  const days = lang === "id" ? DAYS_ID : DAYS_EN;
  const verses = extractVerses(transcript);
  const verseLine = verses.length > 0 ? verses[0] : "";
  const devotions = days.map((day) => {
    const text =
      lang === "id"
        ? `Kasih yang melayani tidak menunggu momen besar. Hari ini, perhatikan satu orang di sekitarmu dan lakukan satu hal kecil untuknya. ${verseLine ? `Renungkan ${verseLine}. ` : ""}Pelayanan yang rendah hati adalah cara kasih menjadi nyata.`
        : `Love that serves does not wait for a big moment. Today, notice one person near you and do one small thing for them. ${verseLine ? `Reflect on ${verseLine}. ` : ""}Humble service is how love becomes visible.`;
    const prayer =
      lang === "id"
        ? "Tuhan, bukalah mataku untuk melihat siapa yang perlu kulayani hari ini. Amin."
        : "Lord, open my eyes to see who I can serve today. Amen.";
    return { day, text, prayer };
  });

  const aiCare = congregants.map((p) => ({
    initials: p.initials,
    action: "message" as const,
    suggestion: suggestionFor(p, lang, false),
    draft: draftFor(p, tone, lang),
  }));
  const enforced = enforceTriage(congregants, aiCare);
  const care = enforced.map((c, i) => {
    const person = congregants[i];
    return {
      ...c,
      category: person.category,
      note: person.note,
      suggestion: c.crisis ? suggestionFor(person, lang, true) : c.suggestion,
      draftApproved: false,
      draftEdited: false,
    };
  });

  const outputText = [
    ...summary.map((s) => s.text),
    ...questions.map((q) => q.text),
    ...devotions.map((d) => `${d.text} ${d.prayer}`),
  ].join("\n");
  const versesFlagged = flagVersesNotInTranscript(outputText, transcript);

  return {
    summary,
    questions,
    devotions,
    care,
    versesInTranscript: verses,
    versesFlagged,
    demoMode: true,
    generatedAt: new Date().toISOString(),
  };
}
