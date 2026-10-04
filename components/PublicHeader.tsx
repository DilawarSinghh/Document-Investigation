"use client";

import { Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const signIn = async () => {
    const sb = supabaseBrowser();
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <a href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Search className="h-3.5 w-3.5" />
          </span>
          Investigator
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button size="sm" variant="outline" onClick={signIn}>
            Sign in
          </Button>
        </div>
      </div>
    </header>
  );
}
