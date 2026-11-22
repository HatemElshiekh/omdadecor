// Latin/digit runs joined by - / . * × (e.g. Edara codes "20-80901", "M1-007", "60*60").
// Inside RTL text the bidi algorithm reorders these ("20-80901" shows as "80901-20"),
// so they must be isolated as LTR.
const CODE_RUN = /[A-Za-z0-9]+(?:[-/.*×][A-Za-z0-9]+)+/g;

export type BidiPart = { text: string; ltr: boolean };

export function splitBidi(text: string): BidiPart[] {
  const parts: BidiPart[] = [];
  let last = 0;
  for (const m of text.matchAll(CODE_RUN)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: text.slice(last, i), ltr: false });
    parts.push({ text: m[0], ltr: true });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), ltr: false });
  return parts;
}
