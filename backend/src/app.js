import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { createRepository } from "./repositories/create-repository.js";
import { createActionRouter } from "./routes/actions.js";
import { createAnomalyRouter } from "./routes/anomalies.js";
import { createAlertRouter } from "./routes/alerts.js";
import { createAuthRouter } from "./routes/auth.js";
import { createDashboardRouter } from "./routes/dashboard.js";
import { createDataSourceRouter } from "./routes/data-sources.js";
import { createProgramRouter } from "./routes/programs.js";
import { createReportRouter } from "./routes/reports.js";
import { createAuditEventRouter } from "./routes/audit-events.js";
import { createAiRouter } from "./routes/ai.js";
import { createSettingsRouter } from "./routes/settings.js";
import { createSetupRouter } from "./routes/setup.js";
import { AiAgentService } from "./services/ai-agent-service.js";
import { ProgramService } from "./services/program-service.js";
import { ReportService } from "./services/report-service.js";
import { authContextMiddleware } from "./utils/auth.js";

export function createApp(options = {}) {
  const app = express();
  const repository = options.repository ?? createRepository();
  const reportService = options.reportService ?? new ReportService();
  const aiAgentService = options.aiAgentService ?? new AiAgentService();
  const programService =
    options.programService ??
    new ProgramService({
      repository,
      reportService
    });

  app.use(cors({ origin: env.frontendOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      app: "program-optimization-agent",
      repository: repository.mode,
      ai: reportService.mode
    });
  });

  app.use(authContextMiddleware);

  app.use("/api/auth", createAuthRouter());
  app.use("/api/dashboard", createDashboardRouter({ programService }));
  app.use("/api/programs", createProgramRouter({ programService }));
  app.use("/api/anomalies", createAnomalyRouter({ programService }));
  app.use("/api/actions", createActionRouter({ programService }));
  app.use("/api/alerts", createAlertRouter({ programService }));
  app.use("/api/reports", createReportRouter({ programService }));
  app.use("/api/data-sources", createDataSourceRouter({ programService }));
  app.use("/api/audit-events", createAuditEventRouter({ programService }));
  app.use("/api/ai", createAiRouter({ programService, aiAgentService }));
  app.use("/api/settings", createSettingsRouter({ programService }));
  app.use("/api/setup", createSetupRouter({ repository }));

  app.use((error, _request, response, _next) => {
    const status = error.statusCode ?? 500;
    const message = error instanceof Error ? error.message : "Unexpected server error";
    const body = { error: message };
    if (Array.isArray(error?.validationErrors)) body.validationErrors = error.validationErrors;
    if (error?.syncRun) body.syncRun = error.syncRun;
    response.status(status).json(body);
  });

  return app;
}
