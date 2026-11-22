import { readFileSync } from 'node:fs';
import { buildSeedSql, uuidv5 } from '../../supabase/seed/seed';

describe('seed', () => {
  it('uuidv5 is deterministic and RFC-shaped', () => {
    const a = uuidv5('edara-row:6');
    expect(a).toBe(uuidv5('edara-row:6'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(uuidv5('edara-row:7'));
  });

  it('committed seed.sql is up to date (run: npm run seed:sql)', () => {
    expect(readFileSync('supabase/seed/seed.sql', 'utf8')).toBe(buildSeedSql());
  });
});
