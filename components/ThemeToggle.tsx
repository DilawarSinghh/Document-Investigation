"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
