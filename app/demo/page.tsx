export default function Demo() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm">
      <h1 className="text-2xl font-bold">Demo workspace seed</h1>
      <p className="mt-2 text-neutral-400">Three sample docs with planted conflicts: refund 30 vs 15 days, retention 90 vs 30 days, old vs new policy version.</p>
      <ol className="mt-4 list-decimal space-y-2 pl-5">
        <li><b>refund-policy-v1.md</b> (Jan 2024): 30-day refunds, 90-day retention.</li>
        <li><b>refund-policy-v2.md</b> (Mar 2025): 15-day refunds, 30-day retention, supersedes v1.</li>
        <li><b>terms-of-service.md</b> (Jun 2024): references v1 retention — conflicts with v2.</li>
      </ol>
      <pre className="mt-4 overflow-auto rounded bg-neutral-900 p-4">DEMO_USER_ID=&lt;your-supabase-user-id&gt; npm run seed:demo</pre>
      <p className="mt-2">Then ask: “What is the refund window?” → expect <b>conflicting</b> verdict with both claims cited.</p>
    </main>
  );
}
