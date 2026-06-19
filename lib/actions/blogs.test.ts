import { describe, it, expect } from 'vitest';
import { generateSlug } from '@/lib/utils/slug';

describe('generateSlug', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('My Blog Post: A Story!')).toBe('my-blog-post-a-story');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(generateSlug('Too   Many   Spaces')).toBe('too-many-spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(generateSlug('  trimmed  ')).toBe('trimmed');
  });

  it('handles already-kebab input', () => {
    expect(generateSlug('already-fine')).toBe('already-fine');
  });
});
