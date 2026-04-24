import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Program Optimization Agent API listening on http://localhost:${env.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. This backend did not start.`);
    console.error("Run npm.cmd run doctor:local to see whether another local service owns the API port.");
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
