import express from "express";

import { createDemoSession } from "../utils/auth.js";
import { asyncRoute } from "../utils/http.js";

export function createAuthRouter() {
  const router = express.Router();

  router.post(
    "/demo-session",
    asyncRoute(async (request, response) => {
      const role = request.body?.role;
      response.json(createDemoSession(role));
    })
  );

  router.get(
    "/me",
    asyncRoute(async (request, response) => {
      response.json({
        user: request.auth?.actor ?? null,
        isAuthenticated: Boolean(request.auth?.isAuthenticated),
        provider: request.auth?.provider ?? "anonymous"
      });
    })
  );

  return router;
}
