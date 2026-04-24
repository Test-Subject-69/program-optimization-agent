import express from "express";

import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute } from "../utils/http.js";

export function createSettingsRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/thresholds",
    asyncRoute(async (_request, response) => {
      response.json({ thresholds: await programService.listOptimizationThresholds() });
    })
  );

  router.patch(
    "/thresholds",
    requireRole("admin"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      const thresholds = await programService.saveOptimizationThresholds(request.body ?? {}, request.auth?.actor);
      response.json({ thresholds });
    })
  );

  return router;
}
