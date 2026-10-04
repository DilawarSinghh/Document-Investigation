"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CornerDownLeft,
  FileText,
  MessageSquare,
  Moon,
  PanelRight,
  Search,
  Sun,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

type Action = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  run: () => void;
};

export function CommandPalette() {
  const { paletteOpen, set, tab, workspaces, workspaceId } = useStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        set({ paletteOpen: !useStore.getState().paletteOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  const actions = useMemo<Action[]>(() => {
    const list: Action[] = [
      {
        id: "chat",
        label: "Go to Chat",
        icon: MessageSquare,
        run: () => set({ tab: "chat" }),
      },
      {
        id: "conflicts",
        label: "Go to Conflict Report",
        icon: FileText,
        run: () => set({ tab: "conflicts" }),
      },
      {
        id: "upload",
        label: "Upload files",
        icon: Upload,
        run: () => window.dispatchEvent(new Event("investigator:upload")),
      },
      {
        id: "sources",
        label: "Toggle source viewer",
        icon: PanelRight,
        run: () => set({ sourcesOpen: !useStore.getState().sourcesOpen }),
      },
      {
        id: "theme",
        label: resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: resolvedTheme === "dark" ? Sun : Moon,
        run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
      },
    ];
    for (const w of workspaces) {
      if (w.id === workspaceId) continue;
      list.push({
        id: `ws-${w.id}`,
        label: `Switch to “${w.name}”`,
        hint: "workspace",
        icon: Search,
        run: () => {
          localStorage.setItem("ws", w.id);
          window.location.reload();
        },
      });
    }
    return list;
  }, [set, tab, workspaces, workspaceId, resolvedTheme, setTheme]);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!paletteOpen) return null;

  const runAction = (a: Action) => {
    set({ paletteOpen: false });
    a.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => set({ paletteOpen: false })}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-popover shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[index]) {
                runAction(filtered[index]);
              } else if (e.key === "Escape") {
                set({ paletteOpen: false });
              }
            }}
            placeholder="Type a command or search…"
            aria-label="Command search"
            className="h-11 flex-1 bg-transparent text-sm focus-visible:outline-none"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results</p>
          )}
          {filtered.map((a, i) => (
            <button
              key={a.id}
              type="button"
              data-index={i}
              onClick={() => runAction(a)}
              onMouseMove={() => setIndex(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-100",
                i === index ? "bg-accent text-accent-foreground" : "text-foreground"
              )}
            >
              <a.icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{a.label}</span>
              {a.hint && (
                <span className="text-xs text-muted-foreground">{a.hint}</span>
              )}
              {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span className="ml-auto">⌘K to close</span>
        </div>
      </div>
    </div>
  );
}
