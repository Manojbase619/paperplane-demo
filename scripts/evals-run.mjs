#!/usr/bin/env node
/**
 * Run evals on a call or transcript via local API.
 * Usage: node scripts/evals-run.mjs [--callId=xxx] [--persist]
 *    or: node scripts/evals-run.mjs --transcript='[{"role":"user","text":"Hi"},{"role":"agent","text":"Hello"}]'
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

const args = process.argv.slice(2);
const opts = {};
for (const a of args) {
  if (a.startsWith("--callId=")) opts.callId = a.slice("--callId=".length);
  if (a.startsWith("--transcript=")) opts.transcript = JSON.parse(a.slice("--transcript=".length));
  if (a === "--persist") opts.persist = true;
}

async function main() {
  const res = await fetch(`${BASE}/api/evals/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Error:", json.error || res.statusText);
    process.exit(1);
  }
  console.log(JSON.stringify(json.result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
