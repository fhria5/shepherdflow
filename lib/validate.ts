/**
 * Sermon-trace and verse validation — server-side, tolerant matching.
 */

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"''`]/g, "'")
    .replace(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A quote is verified when its normalized form occurs in the transcript. */
export function quoteExistsInTranscript(quote: string, transcript: string): boolean {
  const q = normalizeText(quote);
  const t = normalizeText(transcript);
  if (!q || q.split(" ").length < 2) return false;
  if (t.includes(q)) return true;
  // Tolerant fallback: every word of the quote appears in order with small gaps.
  const words = q.split(" ");
  let pos = 0;
  for (const w of words) {
    const idx = t.indexOf(w, pos);
    if (idx === -1) return false;
    pos = idx + w.length;
  }
  return true;
}

/** Word count of a quote (for the 25-word cap display). */
export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

const BOOKS_EN = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges",
  "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalm", "Psalms", "Proverbs", "Ecclesiastes",
  "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John",
  "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter",
  "1 John", "2 John", "3 John", "Jude", "Revelation",
];

const BOOKS_ID = [
  "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", "Yosua", "Hakim-hakim",
  "Rut", "1 Samuel", "2 Samuel", "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh",
  "Ezra", "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal", "Pengkhotbah", "Kidung Agung",
  "Yesaya", "Yeremia", "Ratapan", "Yehezkiel", "Daniel", "Hosea", "Yoel", "Amos",
  "Obaja", "Yunus", "Mikha", "Nahum", "Habakuk", "Zefanya", "Hagai", "Zakharia",
  "Maleakhi", "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", "Roma",
  "1 Korintus", "2 Korintus", "Galatia", "Efesus", "Filipi", "Kolose",
  "1 Tesalonika", "2 Tesalonika", "1 Timotius", "2 Timotius", "Titus", "Filemon",
  "Ibrani", "Yakobus", "1 Petrus", "2 Petrus", "1 Yohanes", "2 Yohanes", "3 Yohanes",
  "Yudas", "Wahyu",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const VERSE_RE = (() => {
  const books = [...BOOKS_EN, ...BOOKS_ID].sort((a, b) => b.length - a.length);
  const pattern = `\\b(${books.map(escapeRegExp).join("|")})\\s+(\\d+):(\\d+(?:-\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)`;
  return new RegExp(pattern, "gi");
})();

/** Extract Bible references like "John 13:34-35" or "Yohanes 13:34". */
export function extractVerses(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  VERSE_RE.lastIndex = 0;
  while ((m = VERSE_RE.exec(text)) !== null) {
    const ref = `${m[1].replace(/\s+/g, " ")} ${m[2]}:${m[3]}`.trim();
    const key = normalizeText(ref);
    if (!seen.has(key)) {
      seen.add(key);
      found.push(ref);
    }
  }
  return found;
}

/** Normalize a verse reference for comparison (book name + chapter:verse). */
export function normalizeVerse(ref: string): string {
  return normalizeText(ref).replace(/\s+/g, " ");
}

/**
 * Flag output verses that do not appear in the transcript.
 * Returns the list of flagged references (as written in the output).
 */
export function flagVersesNotInTranscript(outputText: string, transcript: string): string[] {
  const outVerses = extractVerses(outputText);
  const inVerses = new Set(extractVerses(transcript).map(normalizeVerse));
  return outVerses.filter((v) => !inVerses.has(normalizeVerse(v)));
}
