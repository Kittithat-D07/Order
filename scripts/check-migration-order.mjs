// Static check: every function referenced by a policy must be defined
// BEFORE the first policy that references it.
//
// Postgres validates a policy expression at CREATE POLICY time, so a
// policy calling a not-yet-created function fails with
// "function public.x() does not exist".
//
// Run: node scripts/check-migration-order.mjs

import { readFileSync } from "node:fs";

const files = [
  "supabase/migrations/2026-10-24-production-hardening.sql",
  "supabase/migrations/2026-10-24-access-control.sql",
  "supabase/migrations/2026-10-24-lockdown.sql",
];

const defRe = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi;
const policyRe = /CREATE\s+POLICY\b[\s\S]*?;/gi;
const callRe = /public\.(\w+)\s*\(/g;

let problems = 0;

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  // Strip comments so prose that mentions a function name is not mistaken
  // for a call. Line numbering is preserved by replacing comment text with
  // spaces rather than deleting it.
  const sql = raw
    .replace(/--[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const lineAt = (offset) => sql.slice(0, offset).split("\n").length;

  const defs = [];
  for (const m of sql.matchAll(defRe)) {
    defs.push({ name: m[1], line: lineAt(m.index ?? 0) });
  }

  const policies = [];
  for (const m of sql.matchAll(policyRe)) {
    const text = m[0];
    const nameMatch = text.match(/CREATE\s+POLICY\s+"([^"]+)"/i);
    const calls = new Set();
    for (const c of text.matchAll(callRe)) calls.add(c[1]);
    policies.push({
      name: nameMatch?.[1] ?? "(unnamed)",
      line: lineAt(m.index ?? 0),
      calls: [...calls],
    });
  }

  console.log(`\n=== ${file} ===`);
  console.log(
    `  functions defined: ${defs.map((d) => `${d.name}@${d.line}`).join(", ") || "(none)"}`,
  );
  console.log(`  policies: ${policies.length}`);

  for (const policy of policies) {
    for (const call of policy.calls) {
      const def = defs.find((d) => d.name === call);
      if (!def) {
        console.log(
          `  ~ ${policy.name}@${policy.line} calls ${call}() — not defined in this file`,
        );
        continue;
      }
      if (def.line > policy.line) {
        console.log(
          `  x ${policy.name}@${policy.line} calls ${call}() but it is defined at line ${def.line} — TOO LATE`,
        );
        problems++;
      }
    }
  }
}

console.log(
  problems === 0
    ? "\nOK - no policy references a function defined later in the same file."
    : `\nFAILED - ${problems} ordering problem(s).`,
);
process.exit(problems === 0 ? 0 : 1);
