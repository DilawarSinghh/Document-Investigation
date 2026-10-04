// Eval: 10 questions with expected verdicts. Run: npm run eval -- EVAL_BASE_URL=http://localhost:3000 EVAL_WORKSPACE_ID=<id>
// Prints pass/fail table. Requires seeded demo workspace.
const BASE = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const WS = process.env.EVAL_WORKSPACE_ID ?? "";

const cases: { q: string; expect: string }[] = [
  { q: "What is the refund window?", expect: "conflicting" },
  { q: "How long is data retained after closure?", expect: "conflicting" },
  { q: "Which refund policy version is newest?", expect: "confident" },
  { q: "What is the support email?", expect: "conflicting" },
  { q: "Do annual plans have a refund window?", expect: "confident" },
  { q: "What is the CEO's favorite color?", expect: "insufficient_evidence" },
  { q: "What happens after 15 days under v2?", expect: "confident" },
  { q: "Does the company sell personal data?", expect: "confident" },
  { q: "What did the January 2024 policy say about refunds?", expect: "confident" },
  { q: "What is the quantum flux capacitor warranty?", expect: "insufficient_evidence" },
];

async function main() {
  console.log("| # | question | expected | got | pass |");
  console.log("|---|----------|----------|-----|------|");
  let pass = 0;
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    let got = "error";
    try {
      const r = await fetch(`${BASE}/api/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace_id: WS, question: c.q }) });
      got = (await r.json()).verdict ?? "error";
    } catch { got = "error"; }
    const ok = got === c.expect;
    if (ok) pass++;
    console.log(`| ${i + 1} | ${c.q} | ${c.expect} | ${got} | ${ok ? "PASS" : "FAIL"} |`);
  }
  console.log(`\n${pass}/${cases.length} passed`);
}
main();
