#!/usr/bin/env node
/**
 * Run a scenario simulation via local API.
 * Usage: node scripts/evals-simulate.mjs [--scenarioId=happy_booking_paris] [--persist]
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const args = process.argv.slice(2);
let scenarioId = "happy_booking_paris";
let persist = false;
for (const a of args) {
  if (a.startsWith("--scenarioId=")) scenarioId = a.slice("--scenarioId=".length);
  if (a === "--persist") persist = true;
}

async function main() {
  const res = await fetch(`${BASE}/api/evals/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId, persist }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Error:", json.error || res.statusText);
    process.exit(1);
  }
  console.log("Scenario:", json.scenario?.name);
  console.log("Passed:", json.evalResult?.passed);
  console.log("Overall score:", json.evalResult?.overall_score);
  console.log("Scores:", JSON.stringify(json.evalResult?.scores, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
