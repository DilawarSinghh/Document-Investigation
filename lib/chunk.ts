// ~500 tokens ≈ 2000 chars; overlap 80 tokens ≈ 320 chars. Keeps page + nearest heading.
export function chunkPages(pages: { page: number; text: string }[]): { content: string; page_number: number; section_title: string | null }[] {
  const CH = 2000, OV = 320;
  const out: { content: string; page_number: number; section_title: string | null }[] = [];
  for (const p of pages) {
    const lines = p.text.split("\n");
    let heading: string | null = null;
    let buf = "";
    const flush = () => {
      if (buf.trim().length > 50) out.push({ content: buf.trim(), page_number: p.page, section_title: heading });
      buf = "";
    };
    for (const line of lines) {
      const h = line.match(/^#{1,3}\s+(.*)/) ?? line.match(/^(Section|Article|Policy|Clause)\s+\d+.*$/i);
      if (h) heading = (h[1] ?? line).slice(0, 120);
      buf += line + "\n";
      if (buf.length >= CH) {
        // cut at sentence boundary if possible
        const cut = Math.max(buf.lastIndexOf(". ", CH - 200), CH - OV);
        out.push({ content: buf.slice(0, cut).trim(), page_number: p.page, section_title: heading });
        buf = buf.slice(cut - OV > 0 ? cut - OV : cut);
      }
    }
    flush();
  }
  return out;
}

export function extractDocDate(text: string): string | null {
  const m = text.match(/(effective|updated|revised|dated?)[\s:]*([A-Z][a-z]+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (!m) return null;
  const d = new Date(m[2]);
  return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

export async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
