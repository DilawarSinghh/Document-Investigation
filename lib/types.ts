export type Verdict = "confident" | "conflicting" | "insufficient_evidence";
export type DocStatus = "uploading" | "extracting" | "indexing" | "ready" | "failed";

export interface Citation {
  doc_id: string; filename: string; page: number; section: string | null; quote: string;
}
export interface Claim { claim: string; doc: string; page: number; section: string | null; quote: string; }
export interface Conflict {
  claimA: Claim; claimB: Claim;
  type: "numeric" | "date" | "version_drift" | "direct_contradiction";
  explanation: string; suggested_resolution: string;
}
export interface AskResponse {
  verdict: Verdict; answer: string; confidence: number;
  citations: Citation[]; conflicts: Conflict[]; uncertainty_note: string;
}
export interface ChunkRow {
  id: string; document_id: string; content: string; page_number: number;
  section_title: string | null; chunk_index: number; filename: string;
  doc_date: string | null; combined: number;
}
