import { splitBidi } from '@/lib/bidi';

/** Renders mixed Arabic text with item codes isolated LTR, so "20-80901" never flips. */
export function BidiText({ text }: { text: string }) {
  return (
    <>
      {splitBidi(text).map((p, i) =>
        p.ltr ? (
          <bdi key={i} dir="ltr">
            {p.text}
          </bdi>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
