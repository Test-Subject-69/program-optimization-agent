import assert from "node:assert/strict";
import {
  normalizeDataSourceImport,
  normalizeProgramImport,
  validateImportPayload,
  validateReportTemplateInput,
  validateTrackedActionInput
} from "../src/index.js";

const validImport = validateImportPayload({
  dataSource: {
    name: "Partner operations export",
    sourceType: "CSV",
    owner: "Operations"
  },
  programs: [
    {
      name: "Imported Efficiency Program",
      programType: "Energy efficiency",
      utilityPartner: "Utility partner",
      state: "MI",
      owner: "Program Operations",
      executiveSponsor: "COO",
      households_served: 12,
      households_target: 20
    }
  ],
  importedAt: "2026-04-24T00:00:00.000Z"
});

const normalizedProgram = normalizeProgramImport(validImport.programs[0], 0);
const normalizedDataSource = normalizeDataSourceImport(
  validImport.dataSource,
  [normalizedProgram.id],
  validImport.importedAt
);
const action = validateTrackedActionInput({ title: "Call partner", owner: "COO" });
const template = validateReportTemplateInput({ name: "Ops weekly", focus: "capacity-review", audience: "Ops" });

assert.equal(normalizedProgram.name, "Imported Efficiency Program");
assert.equal(normalizedProgram.metrics.householdsServed, 12);
assert.equal(normalizedProgram.metrics.householdsTarget, 20);
assert.equal(normalizedDataSource.programIds.length, 1);
assert.equal(normalizedDataSource.status, "fresh");
assert.equal(action.status, "open");
assert.equal(template.focus, "capacity-review");

assert.throws(
  () =>
    validateImportPayload({
      dataSource: { name: "Broken feed", sourceType: "CSV", owner: "Operations" },
      programs: [{ name: "Broken program" }]
    }),
  /programs\[0\]\.programType/
);

console.log("shared foundation tests passed");
