import { strict as assert } from "node:assert";
import { calculateProgramKpis, enrichProgram } from "../src/index.js";

// Edge case: zero targets
const zeroTargetProgram = {
  id: "zero-target",
  name: "Zero Target",
  programType: "residential",
  utilityPartner: "Test",
  state: "MI",
  owner: "Test",
  executiveSponsor: "Test",
  status: "active",
  contractValue: 0,
  targetAudience: "Test",
  objective: "Test",
  metrics: {
    householdsTarget: 0,
    householdsServed: 0,
    staffingCapacityPct: 100,
    openRoles: 0,
    backlogCount: 0,
    equityPct: 50,
    equityTargetPct: 50,
    complianceScore: 100
  },
  monthlyTrend: []
};

const enriched = enrichProgram(zeroTargetProgram);
assert.ok(Number.isFinite(enriched.kpis.healthScore), "healthScore should be finite with zero targets");
assert.ok(Number.isFinite(enriched.kpis.deliveryPct), "deliveryPct should be finite");
assert.ok(enriched.kpis.healthScore >= 0 && enriched.kpis.healthScore <= 100, "healthScore in 0-100 range");

// Edge case: NaN/undefined metrics
const nanProgram = {
  ...zeroTargetProgram,
  id: "nan-program",
  name: "NaN Program",
  metrics: {
    householdsTarget: undefined,
    householdsServed: NaN,
    staffingCapacityPct: null,
    openRoles: "not-a-number",
    backlogCount: undefined,
    equityPct: undefined,
    equityTargetPct: undefined,
    complianceScore: undefined
  }
};

const nanEnriched = enrichProgram(nanProgram);
assert.ok(typeof nanEnriched.kpis.healthScore === "number", "healthScore should be a number even with bad input");
assert.ok(!Number.isNaN(nanEnriched.kpis.healthScore), "healthScore should not be NaN");

// Edge case: negative values
const negativeProgram = {
  ...zeroTargetProgram,
  id: "negative-program",
  name: "Negative Program",
  metrics: {
    ...zeroTargetProgram.metrics,
    householdsServed: -100,
    householdsTarget: -50,
    staffingCapacityPct: -10,
    complianceScore: -5
  }
};

const negEnriched = enrichProgram(negativeProgram);
assert.ok(typeof negEnriched.kpis.healthScore === "number", "healthScore should handle negatives");

// Edge case: very large values
const largeProgram = {
  ...zeroTargetProgram,
  id: "large-program",
  name: "Large Program",
  metrics: {
    ...zeroTargetProgram.metrics,
    householdsServed: 999999999,
    householdsTarget: 1000000000,
    staffingCapacityPct: 100
  }
};

const largeEnriched = enrichProgram(largeProgram);
assert.ok(largeEnriched.kpis.healthScore >= 0 && largeEnriched.kpis.healthScore <= 100, "healthScore handles large values");

console.log("shared KPI edge case tests passed");
