import { describe, it, expect } from 'vitest';
import { deriveUsernameFromEmail } from '@/lib/utils/username';

describe('deriveUsernameFromEmail', () => {
  it('takes the local part before the @', () => {
    expect(deriveUsernameFromEmail('jane.doe@example.com')).toBe('jane.doe');
  });

  it('preserves + aliases as typed', () => {
    expect(deriveUsernameFromEmail('jane.doe+newsletter@example.com')).toBe('jane.doe+newsletter');
  });

  it('preserves uppercase letters as typed', () => {
    expect(deriveUsernameFromEmail('Jane.Doe@Example.com')).toBe('Jane.Doe');
  });

  it('handles multiple @-adjacent dots in the local part', () => {
    expect(deriveUsernameFromEmail('j.a.n.e..doe@example.co.uk')).toBe('j.a.n.e..doe');
  });

  it('takes only the portion before the first @ when multiple @ are present', () => {
    expect(deriveUsernameFromEmail('weird@name@example.com')).toBe('weird');
  });
});
