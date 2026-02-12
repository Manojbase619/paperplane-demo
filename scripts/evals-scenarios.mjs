#!/usr/bin/env node
/**
 * List available scenarios via local API.
 * Usage: node scripts/evals-scenarios.mjs
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const res = await fetch(`${BASE}/api/evals/simulate`);
  const json = await res.json();
  if (!res.ok) {
    console.error("Error:", json.error || res.statusText);
    process.exit(1);
  }
  console.log("Scenarios:");
  json.scenarios?.forEach((s) => {
    console.log(`  ${s.id} [${s.category}] ${s.name}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
