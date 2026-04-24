import { api } from "./api";

export function analyzePortfolio() {
  return api("/api/ai/analyze", { method: "POST" });
}

export function askAiQuestion(question) {
  return api("/api/ai/ask", { method: "POST", body: JSON.stringify({ question }) });
}

export function diagnoseProgramAi(programId) {
  return api(`/api/ai/program/${programId}/diagnosis`, { method: "POST" });
}

export function suggestAiActions() {
  return api("/api/ai/suggest-actions", { method: "POST" });
}
