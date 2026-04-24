import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import "dotenv/config";

import {
  checkLocalApi,
  formatApiFailure,
  isLocalUrl,
  localApiUrl,
  portFromUrl
} from "./local-api-contract.mjs";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const apiUrl = localApiUrl();
const backendPort = portFromUrl(apiUrl);
const frontendPort = portFromUrl(process.env.FRONTEND_ORIGIN ?? "http://localhost:3000");
const childProcesses = new Set();
let isShuttingDown = false;

function spawnNpm(args, env = {}) {
  const command = isWindows ? "cmd.exe" : npmCommand;
  const commandArgs = isWindows ? ["/d", "/s", "/c", [npmCommand, ...args].join(" ")] : args;
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit"
  });
  childProcesses.add(child);
  child.on("exit", () => childProcesses.delete(child));
  return child;
}

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  for (const child of childProcesses) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

async function waitForBackend(child) {
  let lastResult = null;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Backend process exited with code ${child.exitCode}`);
    }

    const result = await checkLocalApi(apiUrl);
    if (result.ok) return result;
    lastResult = result;

    if (result.reason === "wrong-contract" || result.reason === "wrong-app") {
      throw new Error(formatApiFailure(apiUrl, result));
    }

    await delay(250);
  }

  throw new Error(formatApiFailure(apiUrl, lastResult ?? { reason: "unreachable" }));
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

let backend = null;
const existingApi = await checkLocalApi(apiUrl);

if (existingApi.ok) {
  console.log(`Using existing Program Optimization Agent backend at ${apiUrl}`);
} else if (existingApi.reason === "wrong-contract" || existingApi.reason === "wrong-app" || !isLocalUrl(apiUrl)) {
  console.error(formatApiFailure(apiUrl, existingApi));
  process.exit(1);
} else {
  console.log(`Starting Program Optimization Agent backend at ${apiUrl}`);
  backend = spawnNpm(["--workspace", "backend", "run", "dev"], { PORT: backendPort });
  backend.on("exit", (code) => {
    if (!isShuttingDown) shutdown(code ?? 1);
  });
  await waitForBackend(backend);
}

console.log(`Starting frontend with API_ORIGIN=${apiUrl}`);
const frontend = spawnNpm(["--workspace", "frontend", "run", "dev"], {
  API_ORIGIN: apiUrl,
  NEXT_PUBLIC_API_URL: "",
  PORT: frontendPort
});

frontend.on("exit", (code) => {
  if (backend && !backend.killed) backend.kill();
  if (!isShuttingDown) shutdown(code ?? 0);
});
