import { describe, it, expect } from 'vitest';
import { projectColorPalette, pickRandomColor, colorForId } from './colors';

describe('pickRandomColor', () => {
  it('always returns a value from the fixed palette', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(projectColorPalette).toContain(pickRandomColor());
    }
  });
});

describe('colorForId', () => {
  it('is deterministic for the same id', () => {
    const id = 'project-123';
    const first = colorForId(id);
    for (let i = 0; i < 20; i += 1) {
      expect(colorForId(id)).toBe(first);
    }
  });

  it('always returns a value from the fixed palette', () => {
    const ids = ['a', 'b', 'abc', 'some-uuid-1234-5678', '', 'zzzzzzzzzzzzzzzzzzzz'];
    for (const id of ids) {
      expect(projectColorPalette).toContain(colorForId(id));
    }
  });
});
