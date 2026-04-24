import express from "express";
import { requireRole } from "../utils/auth.js";
import { asyncRoute } from "../utils/http.js";

export function createAiRouter({ programService, aiAgentService }) {
  const router = express.Router();

  router.post(
    "/analyze",
    requireRole("read-only"),
    asyncRoute(async (request, response) => {
      const [programs, dataSources, snapshots, thresholds] = await Promise.all([
        programService.listPrograms(),
        programService.listDataSources(),
        programService.repository.listKpiSnapshots?.() ?? Promise.resolve([]),
        programService.getThresholds()
      ]);
      const result = await aiAgentService.analyzePortfolio({
        programs: programs.filter(p => !p.deletedAt),
        dataSources,
        thresholds,
        snapshots
      });
      response.json(result);
    })
  );

  router.post(
    "/ask",
    requireRole("read-only"),
    asyncRoute(async (request, response) => {
      const { question } = request.body ?? {};
      if (!question || typeof question !== "string" || !question.trim()) {
        response.status(400).json({ error: "Question is required." });
        return;
      }
      const [programs, dataSources, snapshots, thresholds] = await Promise.all([
        programService.listPrograms(),
        programService.listDataSources(),
        programService.repository.listKpiSnapshots?.() ?? Promise.resolve([]),
        programService.getThresholds()
      ]);
      const result = await aiAgentService.askQuestion({
        question: question.trim(),
        programs: programs.filter(p => !p.deletedAt),
        dataSources,
        thresholds,
        snapshots
      });
      response.json(result);
    })
  );

  router.post(
    "/program/:id/diagnosis",
    requireRole("read-only"),
    asyncRoute(async (request, response) => {
      const detail = await programService.getProgramDetail(request.params.id);
      if (!detail?.program) {
        response.status(404).json({ error: "Program not found." });
        return;
      }
      const result = await aiAgentService.diagnoseProgram({
        program: detail.program,
        anomalies: detail.anomalies,
        actions: detail.recommendedActions,
        snapshots: detail.snapshots
      });
      response.json(result);
    })
  );

  router.post(
    "/suggest-actions",
    requireRole("read-only"),
    asyncRoute(async (request, response) => {
      const [programs, dataSources, snapshots, thresholds] = await Promise.all([
        programService.listPrograms(),
        programService.listDataSources(),
        programService.repository.listKpiSnapshots?.() ?? Promise.resolve([]),
        programService.getThresholds()
      ]);
      const result = await aiAgentService.suggestActions({
        programs: programs.filter(p => !p.deletedAt),
        dataSources,
        thresholds,
        snapshots
      });
      response.json(result);
    })
  );

  return router;
}
