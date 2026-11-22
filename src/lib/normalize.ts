// Arabic search normalization (PLAN.md 14.1). Shared by the client, the seed and
// Edge Functions: keep it dependency-free.

const ARABIC_INDIC = /[٠-٩]/g; // ٠-٩
const EXT_ARABIC_INDIC = /[۰-۹]/g; // ۰-۹ (Persian digits)
const TASHKEEL = /[ً-ْ]/g;
const TATWEEL = /ـ/g;

export function normalize(input: string): string {
  return (
    input
      .toLowerCase()
      // 1. Arabic-Indic digits -> ASCII
      .replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(EXT_ARABIC_INDIC, (d) => String(d.charCodeAt(0) - 0x06f0))
      // 3. strip tashkeel and tatweel (before letter folding)
      .replace(TASHKEEL, '')
      .replace(TATWEEL, '')
      // 2. letter folding
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      // 4. Edara noise: "+", repeated punctuation, stray separators
      .replace(/\+/g, ' ')
      .replace(/([.,،؛:;!?_|\\/*"'()[\]{}-])\1+/g, '$1')
      .replace(/[،؛:;!?_|\\"'()[\]{}]/g, ' ')
      // collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}
