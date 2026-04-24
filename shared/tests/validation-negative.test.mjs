import { strict as assert } from "node:assert";
import {
  validateTrackedActionInput,
  validateAlertInput,
  validateImportPayload,
  validateOptimizationThresholdsInput,
  validateProgramId,
  validateProgramUpdateInput
} from "../src/index.js";

function assertThrows(fn, pattern) {
  try {
    fn();
    assert.fail("Expected an error");
  } catch (error) {
    if (pattern && !error.message.includes(pattern)) {
      assert.fail(`Expected error containing "${pattern}", got: "${error.message}"`);
    }
  }
}

// validateTrackedActionInput
assertThrows(() => validateTrackedActionInput({}), "title is required");
assertThrows(() => validateTrackedActionInput({ title: "Test" }), "owner is required");
assertThrows(() => validateTrackedActionInput({ title: "", owner: "Bob" }), "title is required");
assertThrows(
  () => validateTrackedActionInput({ title: "Test", owner: "Bob", due: "2020-01-01" }),
  "due date cannot be in the past"
);

// HTML stripping
const result = validateTrackedActionInput({ title: "<b>Bold</b>", owner: "<em>Alice</em>", reason: "<img src=x>" });
assert.equal(result.title, "Bold");
assert.equal(result.owner, "Alice");
assert.ok(!result.reason.includes("<"), "reason should have no HTML tags");

// validateAlertInput
assertThrows(() => validateAlertInput({}), "title is required");
assertThrows(() => validateAlertInput({ title: "Test" }), "category is required");
assertThrows(
  () => validateAlertInput({ title: "Test", category: "Data", severity: "critical" }),
  "severity must be one of"
);

const alert = validateAlertInput({ title: "Test", category: "Data", severity: "high" });
assert.equal(alert.severity, "high");
assert.equal(alert.title, "Test");

// validateProgramId
assertThrows(() => validateProgramId(""), "Program ID must be");
assertThrows(() => validateProgramId("ABC-UPPER"), "Program ID must be");
assertThrows(() => validateProgramId("has spaces"), "Program ID must be");
assertThrows(() => validateProgramId("a"), "Program ID must be");
assertThrows(() => validateProgramId("-starts-with-dash"), "Program ID must be");
validateProgramId("valid-program-id");
validateProgramId("ab");

// validateImportPayload
assertThrows(() => validateImportPayload({}), "dataSource is required");
assertThrows(
  () => validateImportPayload({ dataSource: { name: "X", sourceType: "CSV", owner: "Team" } }),
  "programs must contain at least one program"
);
assertThrows(
  () =>
    validateImportPayload({
      dataSource: { name: "X", sourceType: "CSV", owner: "Team" },
      programs: [{}]
    }),
  "name is required"
);

// validateProgramUpdateInput
assertThrows(() => validateProgramUpdateInput({ owner: "" }), "owner is required");
assertThrows(() => validateProgramUpdateInput({ metrics: { staffingCapacityPct: 101 } }), "metrics.staffingCapacityPct must be at most 100");

// validateOptimizationThresholdsInput
assertThrows(
  () => validateOptimizationThresholdsInput({ deliveryWarningPct: 80, deliveryCriticalPct: 90 }),
  "deliveryCriticalPct must be less than or equal to deliveryWarningPct"
);
validateOptimizationThresholdsInput({ deliveryWarningPct: 84, staffingTargetPct: 80 });

console.log("shared validation negative tests passed");
