"use client";

import { AlertTriangle, ArrowRight, FileText, Search, ShieldCheck, Upload } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase-browser";

const steps = [
  {
    icon: Upload,
    title: "Upload",
    text: "Drop PDFs, images, or text files. They are parsed, chunked, and embedded automatically.",
  },
  {
    icon: Search,
    title: "Ask",
    text: "Ask anything in natural language. Hybrid search finds the exact passages that matter.",
  },
  {
    icon: ShieldCheck,
    title: "Verify",
    text: "Every answer ships with citations. Conflicts are surfaced, and uncertainty is stated.",
  },
];

export default function Landing() {
  const signIn = async () => {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4">
        <section className="mx-auto max-w-2xl py-20 text-center sm:py-28">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            Ask anything across your documents.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Investigator reads your files, answers with exact citations, flags conflicts between
            documents, and tells you when the evidence is not there.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button size="lg" onClick={signIn}>
              Sign in with Google
              <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={() => (window.location.href = "/demo")}>
              View demo
            </Button>
          </div>
        </section>

        <section className="grid gap-3 pb-16 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-lg border border-border bg-card p-4">
              <s.icon className="h-4 w-4 text-primary" />
              <h2 className="mt-3 text-sm font-medium">{s.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </section>

        <section className="mx-auto max-w-2xl pb-20">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Conflict detection, built in
          </p>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                <AlertTriangle className="h-3 w-3" />
                Conflict detected
              </span>
              <span className="text-xs text-muted-foreground">refund window</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="font-mono">refund-policy-v1.md</span>
                  <span>p.1</span>
                </div>
                <p className="mt-1.5 text-xs leading-5">
                  Customers may request a full refund within <span className="font-medium text-foreground">30 days</span> of
                  purchase.
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  <span className="font-mono">refund-policy-v2.md</span>
                  <span>p.1</span>
                </div>
                <p className="mt-1.5 text-xs leading-5">
                  Customers may request a full refund within <span className="font-medium text-foreground">15 days</span> of
                  purchase.
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Numeric conflict — v2 (Mar 2025) supersedes v1 (Jan 2024). Both are shown, never silently
              resolved.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
