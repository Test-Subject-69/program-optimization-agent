import express from "express";
import { requireRole } from "../utils/auth.js";
import { asyncRoute, paginate } from "../utils/http.js";

export function createAuditEventRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    requireRole("admin"),
    asyncRoute(async (request, response) => {
      const all = await programService.listAuditEvents();
      const { data, pagination } = paginate(all, request.query);
      response.json({ auditEvents: data, pagination });
    })
  );

  return router;
}
