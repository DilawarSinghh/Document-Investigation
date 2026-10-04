import { PublicHeader } from "@/components/PublicHeader";

export default function Demo() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-xl font-semibold">Demo workspace seed</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Three sample documents with planted conflicts: refund 30 vs 15 days, retention 90 vs 30
          days, and an old vs new policy version.
        </p>
        <ol className="mt-6 space-y-3 text-sm">
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-mono text-xs text-muted-foreground">refund-policy-v1.md</span>
            <p className="mt-1 text-sm">Effective Jan 2024 — 30-day refunds, 90-day retention.</p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-mono text-xs text-muted-foreground">refund-policy-v2.md</span>
            <p className="mt-1 text-sm">
              Effective Mar 2025 — 15-day refunds, 30-day retention, supersedes v1.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-card p-4">
            <span className="font-mono text-xs text-muted-foreground">terms-of-service.md</span>
            <p className="mt-1 text-sm">
              Effective Jun 2024 — references v1 retention, which conflicts with v2.
            </p>
          </li>
        </ol>
        <pre className="mt-6 overflow-auto rounded-lg border border-border bg-card p-4 font-mono text-xs">
          DEMO_USER_ID=&lt;your-supabase-user-id&gt; npm run seed:demo
        </pre>
        <p className="mt-3 text-sm text-muted-foreground">
          Then ask: <span className="font-medium text-foreground">“What is the refund window?”</span>{" "}
          — expect a <span className="font-medium text-warning">conflicting</span> verdict with both
          claims cited.
        </p>
      </main>
    </div>
  );
}
