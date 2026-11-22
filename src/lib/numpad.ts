export type NumPadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '.'
  | 'back'
  | 'clear';

/**
 * Pure reducer so screens can drive a value from NumPad keys.
 * 'pin' keeps every digit (0012 is a valid PIN); 'decimal' drops a leading zero (07 -> 7).
 */
export function applyNumPadKey(
  value: string,
  key: NumPadKey,
  maxLength = 12,
  mode: 'pin' | 'decimal' = 'decimal',
): string {
  if (key === 'clear') return '';
  if (key === 'back') return value.slice(0, -1);
  if (key === '.') {
    if (value.includes('.')) return value;
    return value === '' ? '0.' : value + '.';
  }
  if (value.length >= maxLength) return value;
  if (mode === 'decimal' && value === '0') return key;
  return value + key;
}
