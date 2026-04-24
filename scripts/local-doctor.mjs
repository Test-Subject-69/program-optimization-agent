import { checkLocalApi, formatApiFailure, localApiUrl } from "./local-api-contract.mjs";

const apiUrl = localApiUrl();
const result = await checkLocalApi(apiUrl);

if (!result.ok) {
  console.error(formatApiFailure(apiUrl, result));
  process.exit(1);
}

console.log(
  `Local API OK: ${apiUrl} (${result.dashboard.programs.length} programs, ${result.dashboard.anomalies.length} anomalies)`
);
