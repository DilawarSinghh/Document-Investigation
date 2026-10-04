import { create } from "zustand";

export type DocItem = { id: string; filename: string; status: string; workspace_id: string };
export type Verdict = "confident" | "conflicting" | "insufficient_evidence";
export type Msg = {
  id: string; role: "user" | "assistant"; content: string;
  verdict?: Verdict; citations?: { doc_id: string; filename: string; page: number; section: string | null; quote: string }[];
  conflicts?: { claimA: { claim: string; doc: string; page: number }; claimB: { claim: string; doc: string; page: number }; type: string; explanation: string }[];
  uncertainty_note?: string;
};
type State = {
  workspaceId: string | null; docs: DocItem[]; messages: Msg[];
  source: { docId: string; page: number; quote: string } | null; tab: "chat" | "conflicts";
  set: (p: Partial<State>) => void;
  push: (m: Msg) => void;
};

export const useStore = create<State>((set) => ({
  workspaceId: null, docs: [], messages: [], source: null, tab: "chat",
  set: (p) => set(p),
  push: (m) => set((s) => ({ messages: [...s.messages, m] })),
}));
