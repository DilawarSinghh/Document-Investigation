import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = genAI().getGenerativeModel({ model: "text-embedding-004" });
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 16) {
    const batch = texts.slice(i, i + 16);
    const res = await Promise.all(batch.map((t) => model.embedContent(t.slice(0, 8000))));
    for (const r of res) out.push(r.embedding.values.slice(0, 768));
  }
  return out;
}

export async function ocrImage(base64: string, mime = "image/png"): Promise<string> {
  const model = genAI().getGenerativeModel({ model: "gemini-1.5-flash" });
  const res = await model.generateContent([
    { text: "Transcribe this document image exactly. Return only the transcribed text, preserving headings and page structure." },
    { inlineData: { data: base64, mimeType: mime } },
  ]);
  return res.response.text();
}

export async function withBackoff<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; await new Promise((r) => setTimeout(r, 500 * 2 ** i)); }
  }
  throw last;
}
