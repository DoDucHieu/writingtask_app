export type GlossaryEntry = {
  word: string;
  meaning: string;
  example: string;
};

export const glossary: GlossaryEntry[] = [
  { word: "contrast", meaning: "tương phản, trái ngược", example: "contrasting views" },
  { word: "inequality", meaning: "sự bất bình đẳng", example: "reduce inequality" },
  { word: "tuition", meaning: "học phí", example: "free tuition" },
  { word: "scholarship", meaning: "học bổng", example: "offer a scholarship" },
  { word: "disadvantaged", meaning: "có hoàn cảnh khó khăn", example: "disadvantaged students" },
  { word: "affordable", meaning: "vừa túi tiền", example: "affordable fees" },
  { word: "financial aid", meaning: "hỗ trợ tài chính", example: "financial aid for students" },
  { word: "potential", meaning: "năng lực, tiềm năng", example: "their potential is wasted" },
  { word: "debt", meaning: "nợ", example: "student debt" },
  { word: "budget", meaning: "ngân sách", example: "the state budget" },
  { word: "practical", meaning: "thực tế, khả thi", example: "a practical measure" },
  { word: "urgent", meaning: "cấp bách", example: "an urgent problem" },
  { word: "single-use", meaning: "dùng một lần", example: "single-use plastic" },
  { word: "convenient", meaning: "tiện lợi", example: "cheap and convenient" },
  { word: "recycling", meaning: "tái chế", example: "a recycling plant" },
  { word: "infrastructure", meaning: "cơ sở hạ tầng", example: "weak infrastructure" },
  { word: "consumer", meaning: "người tiêu dùng", example: "consumers rarely refuse it" },
  { word: "measure", meaning: "biện pháp", example: "practical measures" },
  { word: "tackle", meaning: "giải quyết (vấn đề)", example: "tackle plastic waste" },
  { word: "harm", meaning: "gây hại", example: "social media harms young people" },
  { word: "concentration", meaning: "sự tập trung", example: "reduce concentration" },
  { word: "anxiety", meaning: "sự lo lắng", example: "increase anxiety" },
  { word: "confidence", meaning: "sự tự tin", example: "damage their confidence" },
  { word: "moderation", meaning: "mức độ vừa phải", example: "use it in moderation" },
  { word: "overuse", meaning: "lạm dụng, dùng quá mức", example: "when it is overused" },
  { word: "benefit", meaning: "hưởng lợi, lợi ích", example: "benefit from it" },
  { word: "ban", meaning: "cấm", example: "banning it completely" },
  { word: "however", meaning: "tuy nhiên", example: "However, there is another side." },
  { word: "therefore", meaning: "vì vậy", example: "Therefore, schools should act." },
  { word: "in conclusion", meaning: "kết luận", example: "In conclusion, both views have merit." },
  { word: "on the one hand", meaning: "một mặt", example: "On the one hand, it is fair." },
  { word: "on the other hand", meaning: "mặt khác", example: "On the other hand, it is costly." },
  { word: "for instance", meaning: "ví dụ", example: "For instance, many students drop out." },
  { word: "in addition", meaning: "thêm vào đó", example: "In addition, cities lack recycling." },
  { word: "rather than", meaning: "thay vì", example: "teach skills rather than banning phones" },
  { word: "instead of", meaning: "thay vì", example: "bring a bag instead of taking plastic" },
];

export function searchGlossary(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return glossary
    .filter(
      (entry) =>
        entry.word.toLowerCase().includes(needle) ||
        entry.meaning.toLowerCase().includes(needle),
    )
    .slice(0, 5);
}
