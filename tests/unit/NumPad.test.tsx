import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumPad } from '@/components/NumPad';
import { applyNumPadKey } from '@/lib/numpad';
import { ar } from '@/i18n/ar';

describe('NumPad', () => {
  it('renders a 3x4 grid of 12 keys', () => {
    render(<NumPad onKey={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(12);
  });

  it('emits digit, backspace and clear keys in pin mode', async () => {
    const onKey = vi.fn();
    render(<NumPad mode="pin" onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: '7' }));
    await userEvent.click(screen.getByRole('button', { name: ar.a11y.backspace }));
    await userEvent.click(screen.getByRole('button', { name: ar.a11y.clear }));
    expect(onKey.mock.calls.map((c) => c[0])).toEqual(['7', 'back', 'clear']);
    expect(screen.queryByRole('button', { name: ar.a11y.decimal })).toBeNull();
  });

  it('shows a decimal key in decimal mode', async () => {
    const onKey = vi.fn();
    render(<NumPad mode="decimal" onKey={onKey} />);
    await userEvent.click(screen.getByRole('button', { name: ar.a11y.decimal }));
    expect(onKey).toHaveBeenCalledWith('.');
  });

  it('disables every key', () => {
    render(<NumPad onKey={() => {}} disabled />);
    screen.getAllByRole('button').forEach((b) => expect(b).toBeDisabled());
  });
});

describe('applyNumPadKey', () => {
  it.each([
    ['', '1', '1'],
    ['12', 'back', '1'],
    ['', 'back', ''],
    ['123', 'clear', ''],
    ['', '.', '0.'],
    ['2', '.', '2.'],
    ['2.5', '.', '2.5'],
    ['0', '4', '4'],
  ] as const)('%s + %s = %s', (value, key, expected) => {
    expect(applyNumPadKey(value, key)).toBe(expected);
  });

  it('respects maxLength (PIN = 4)', () => {
    expect(applyNumPadKey('1234', '5', 4)).toBe('1234');
  });
});
