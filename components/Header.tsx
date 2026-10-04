"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, LogOut, PanelLeft, Search } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useStore } from "@/store/useStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export function Header() {
  const { workspaceName, workspaces, workspaceId, set } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ""));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const switchWorkspace = (id: string) => {
    localStorage.setItem("ws", id);
    window.location.reload();
  };

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Toggle sidebar"
          onClick={() => set({ sidebarCollapsed: !useStore.getState().sidebarCollapsed, sidebarOpen: true })}
          className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Switch workspace"
            className="flex max-w-[180px] items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[260px]"
          >
            <span className="truncate">{workspaceName || "Workspace"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Workspaces</p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (w.id !== workspaceId) switchWorkspace(w.id);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-accent",
                    w.id === workspaceId && "text-primary"
                  )}
                >
                  <span className="truncate">{w.name}</span>
                  {w.id === workspaceId && <span className="text-xs">current</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {userEmail ? userEmail[0].toUpperCase() : <Search className="h-3.5 w-3.5" />}
          </span>
          <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:block">
            {userEmail}
          </span>
          <button
            type="button"
            onClick={signOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
