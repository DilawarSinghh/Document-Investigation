import { create } from "zustand";

export type Verdict = "confident" | "conflicting" | "insufficient_evidence";
export type DocItem = {
  id: string;
  filename: string;
  status: string;
  page_count: number;
  doc_date: string | null;
};
export type Citation = { doc_id: string; filename: string; page: number; section: string | null; quote: string };
export type Conflict = {
  claimA: { claim: string; doc: string; page: number };
  claimB: { claim: string; doc: string; page: number };
  type: string;
  explanation: string;
  suggested_resolution: string;
};
export type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  verdict?: Verdict;
  citations?: Citation[];
  conflicts?: Conflict[];
  uncertainty_note?: string;
};

type State = {
  workspaceId: string | null;
  workspaceName: string;
  workspaces: { id: string; name: string }[];
  docs: DocItem[];
  messages: Msg[];
  source: { docId: string; page: number; quote: string } | null;
  tab: "chat" | "conflicts";
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  sourcesOpen: boolean;
  paletteOpen: boolean;
  set: (p: Partial<State>) => void;
  push: (m: Msg) => void;
};

export const useStore = create<State>((set) => ({
  workspaceId: null,
  workspaceName: "",
  workspaces: [],
  docs: [],
  messages: [],
  source: null,
  tab: "chat",
  sidebarOpen: false,
  sidebarCollapsed: false,
  sourcesOpen: true,
  paletteOpen: false,
  set: (p) => set(p),
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
}));
