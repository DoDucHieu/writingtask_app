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

export type Feedback = {
  accuracy: number;
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
