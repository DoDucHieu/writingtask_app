export type Improvement = {
  title: string;
  explanation: string;
  example: string;
};

export type Achievement = {
  title: string;
  detail: string;
};

export type UserStats = {
  name: string;
  email: string;
  credits: number;
  points: number;
  streak: number;
  canTopup: boolean;
  achievements: Achievement[];
};

export type ScoreBreakdown = {
  meaning: number;
  grammar: number;
  vocabulary: number;
  coherence: number;
};

export type GradeError = {
  criterion: keyof ScoreBreakdown;
  issue: string;
};

/** Lý do câu chưa qua: tổng dưới ngưỡng, thiếu ý, hoặc còn lỗi ngữ pháp. */
export type BlockReason = "score" | "meaning" | "grammar";

export type Feedback = {
  accuracy: number;
  errors: GradeError[];
  blockReason: BlockReason | null;
  /** null với bài chấm mẫu hoặc bài nộp trước khi có chấm theo tiêu chí. */
  breakdown: ScoreBreakdown | null;
  suggestedImprovements: Improvement[];
  comment: string;
  isPerfect: boolean;
  englishText: string;
  aiMode: "gemini" | "openai" | "demo";
  pointsAwarded: number;
};

export type PracticeSentence = {
  id: string;
  order: number;
  vietnameseHint: string;
  keywords: string[];
  structureTip: string;
  status: "done" | "current" | "locked";
  englishText: string | null;
  accuracy: number | null;
  feedback: Feedback | null;
};

export type EssaySummary = {
  slug: string;
  title: string;
  prompt: string;
  topic: string;
  difficulty: string;
  sentenceCount: number;
  status: "new" | "in_progress" | "completed";
  done: number;
  total: number;
  attemptId: string | null;
  pointsEarned: number;
};

export type PracticeState = {
  user: UserStats;
  essay: {
    slug: string;
    title: string;
    prompt: string;
    topic: string;
    difficulty: string;
  };
  sentences: PracticeSentence[];
  progress: { done: number; total: number };
  feedback: Feedback | null;
  /** Lần nộp kế tiếp của câu hiện tại không trừ token (vừa bị chặn chỉ vì ngữ pháp). */
  freeRetry: boolean;
  attemptId: string;
  completed: boolean;
};

export type SummarySentence = {
  order: number;
  vietnameseHint: string;
  englishText: string | null;
  referenceEnglish: string;
  accuracy: number | null;
  comment: string | null;
  isPerfect: boolean;
  suggestedImprovements: Improvement[];
};

export type SummaryState = {
  attemptId: string;
  status: string;
  pointsEarned: number;
  averageAccuracy: number | null;
  essay: {
    slug: string;
    title: string;
    prompt: string;
    topic: string;
  };
  sentences: SummarySentence[];
  user: UserStats;
};
