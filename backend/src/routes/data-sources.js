import express from "express";
import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute } from "../utils/http.js";

export function createDataSourceRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (_request, response) => {
      const [dataSources, syncRuns] = await Promise.all([
        programService.listDataSources(),
        programService.listSyncRuns()
      ]);
      response.json({ dataSources, syncRuns });
    })
  );

  router.post(
    "/import",
    requireRole("operator"),
    requireCsrf,
    asyncRoute(async (request, response) => {
      response.status(201).json(await programService.importDataSource(request.body ?? {}, request.auth?.actor));
    })
  );

  return router;
}
