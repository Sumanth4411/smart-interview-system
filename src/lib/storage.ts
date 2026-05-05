export type InterviewSession = {
  id: string;
  date: string;
  domain: string;
  scores: { technical: number; communication: number; confidence: number; overall: number };
  qa: Array<{
    question: string;
    answer: string;
    evaluation?: {
      correctness: number;
      clarity: number;
      confidence: number;
      missingConcepts: string[];
      feedback: string;
      improvedAnswer: string;
    };
  }>;
  summary?: { summary: string; strengths: string[]; improvements: string[] };
};

const KEY = "voxprep:history";

export function getHistory(): InterviewSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSession(s: InterviewSession) {
  const all = getHistory();
  all.unshift(s);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
