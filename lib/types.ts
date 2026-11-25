import { z } from "zod";

export type Tradition = "Protestant" | "Catholic" | "Pentecostal/Charismatic" | "Other";
export type Tone = "formal" | "warm" | "simple";
export type OutputLang = "en" | "id";
export type UiLang = "en" | "id";
export type Category =
  | "new"
  | "absent"
  | "sick"
  | "grieving"
  | "birthday"
  | "other";

export interface Congregant {
  id: string;
  initials: string;
  category: Category;
  note: string;
}

export interface GenerateRequest {
  transcript: string;
  tradition: Tradition;
  tone: Tone;
  outputLang: OutputLang;
  congregants: Congregant[];
}

export const SummaryPointSchema = z.object({
  text: z.string().min(1),
  quote: z.string().min(1),
});

export const QuestionSchema = z.object({
  text: z.string().min(1),
  quote: z.string().min(1),
});

export const DevotionSchema = z.object({
  day: z.string().min(1),
  text: z.string().min(1),
  prayer: z.string().min(1),
});

export const CareItemSchema = z.object({
  initials: z.string().min(1),
  action: z.enum(["message", "visit"]),
  suggestion: z.string().min(1),
  draft: z.string().optional(),
});

export const GenerateOutputSchema = z.object({
  summary: z.array(SummaryPointSchema).min(3).max(4),
  questions: z.array(QuestionSchema).length(5),
  devotions: z.array(DevotionSchema).length(5),
  care: z.array(CareItemSchema),
});

export type GenerateOutput = z.infer<typeof GenerateOutputSchema>;

export interface SummaryPoint extends z.infer<typeof SummaryPointSchema> {
  quoteVerified: boolean;
  quoteUnverifiedReason?: string;
}

export interface Question extends z.infer<typeof QuestionSchema> {
  quoteVerified: boolean;
}

export interface Devotion extends z.infer<typeof DevotionSchema> {}

export interface CareItem extends z.infer<typeof CareItemSchema> {
  category: Category;
  note: string;
  crisis: boolean;
  draftApproved: boolean;
  draftEdited: boolean;
}

export interface GenerateResult {
  summary: SummaryPoint[];
  questions: Question[];
  devotions: Devotion[];
  care: CareItem[];
  versesInTranscript: string[];
  versesFlagged: string[];
  demoMode: boolean;
  generatedAt: string;
}

export const CATEGORY_LABELS: Record<Category, { en: string; id: string }> = {
  new: { en: "New congregant", id: "Jemaat baru" },
  absent: { en: "Absent a while", id: "Lama tidak hadir" },
  sick: { en: "Sick", id: "Sakit" },
  grieving: { en: "Grieving", id: "Berduka" },
  birthday: { en: "Birthday", id: "Ulang tahun" },
  other: { en: "Other", id: "Lainnya" },
};

export const DAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAYS_ID = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
