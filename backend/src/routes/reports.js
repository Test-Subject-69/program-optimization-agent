import express from "express";
import { buildSimplePdf } from "../utils/pdf.js";
import { requireCsrf, requireRole } from "../utils/auth.js";
import { asyncRoute, rateLimit } from "../utils/http.js";

const reportRateLimit = rateLimit(60000, 5);

export function createReportRouter({ programService }) {
  const router = express.Router();

  router.get(
    "/",
    asyncRoute(async (_request, response) => {
      response.json({ reports: await programService.listReports() });
    })
  );

  router.post(
    "/generate",
    requireRole("read-only"),
    requireCsrf,
    reportRateLimit,
    asyncRoute(async (request, response) => {
      const report = await programService.generateReport(request.body ?? {}, request.auth?.actor);
      response.status(201).json({ report });
    })
  );

  router.get(
    "/:id/export/pdf",
    asyncRoute(async (request, response) => {
      const report = await programService.getReport(request.params.id);
      if (!report) {
        response.status(404).json({ error: "Report not found" });
        return;
      }

      const pdf = buildSimplePdf({
        title: report.title,
        subtitle: `${report.focus} - ${report.audience}`,
        body: report.summary
      });

      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `attachment; filename="${report.id}.pdf"`);
      response.send(pdf);
    })
  );

  return router;
}
