import express from "express";
import { asyncRoute, paginate } from "../utils/http.js";

export function createAnomalyRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (request, response) => {
      const result = await programService.listAnomalies();
      const { data, pagination } = paginate(result.anomalies, request.query);
      response.json({ summary: result.summary, anomalies: data, pagination, thresholds: result.thresholds });
    })
  );

  return router;
}
