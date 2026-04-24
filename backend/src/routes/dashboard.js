import express from "express";
import { asyncRoute } from "../utils/http.js";

export function createDashboardRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (_request, response) => {
      response.json(await programService.getDashboard());
    })
  );

  return router;
}
