"use client";

import { FileText, MessageSquare, PanelRight } from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { tab, set, source } = useStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-stretch border-t border-border bg-background md:hidden"
      aria-label="Mobile navigation"
    >
      <button
        type="button"
        onClick={() => set({ sidebarOpen: true })}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open documents"
      >
        <FileText className="h-4 w-4" />
        Docs
      </button>
      <button
        type="button"
        onClick={() => set({ tab: "chat", sidebarOpen: false, sourcesOpen: false })}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          tab === "chat" ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </button>
      <button
        type="button"
        onClick={() => {
          if (source) set({ sourcesOpen: true });
          else set({ tab: "conflicts", sidebarOpen: false });
        }}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open sources"
      >
        <PanelRight className="h-4 w-4" />
        Sources
      </button>
    </nav>
  );
}
