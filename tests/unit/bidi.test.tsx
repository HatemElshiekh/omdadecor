import { render } from '@testing-library/react';
import { splitBidi } from '@/lib/bidi';
import { BidiText } from '@/components/BidiText';

describe('splitBidi', () => {
  it('isolates Edara codes', () => {
    expect(splitBidi('بديل خشب 20 سم كود 20-80901')).toEqual([
      { text: 'بديل خشب 20 سم كود ', ltr: false },
      { text: '20-80901', ltr: true },
    ]);
  });
  it('handles latin codes and tile sizes', () => {
    expect(
      splitBidi('كود M1-007 مقاس 60*60')
        .filter((p) => p.ltr)
        .map((p) => p.text),
    ).toEqual(['M1-007', '60*60']);
  });
  it('leaves plain text alone', () => {
    expect(splitBidi('بديل رخام')).toEqual([{ text: 'بديل رخام', ltr: false }]);
  });
});

describe('BidiText', () => {
  it('wraps codes in an LTR bdi', () => {
    const { container } = render(<BidiText text="كود 20-80901" />);
    const bdi = container.querySelector('bdi');
    expect(bdi).toHaveAttribute('dir', 'ltr');
    expect(bdi).toHaveTextContent('20-80901');
  });
});
