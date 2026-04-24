import express from "express";
import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute } from "../utils/http.js";

export function createSetupRouter({ repository }) {
  const router = express.Router();

  router.post(
    "/seed",
    requireRole("admin"),
    requireCsrf,
    asyncRoute(async (_request, response) => {
      response.json(await repository.seedSamples());
    })
  );

  return router;
}
