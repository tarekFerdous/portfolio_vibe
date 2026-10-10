import { describe, it, expect } from 'vitest';
import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Enki App', 'enki-app'],
    ['Data Analytics and Visualization - OpenSearch', 'data-analytics-and-visualization-opensearch'],
    ['  Leading and trailing  ', 'leading-and-trailing'],
    ['suitCommerceV2', 'suitcommercev2'],
    ['C++ / Rust: Interop!', 'c-rust-interop'],
    ['Multiple---dashes__and   spaces', 'multiple-dashes-and-spaces'],
    ['Café Déjà vu', 'caf-d-j-vu'],
    ['!!!', ''],
    ['', ''],
  ])('slugify(%j) -> %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('isValidSlug', () => {
  it.each([
    ['enki-app', true],
    ['v2', true],
    ['', false],
    ['-leading', false],
    ['trailing-', false],
    ['double--dash', false],
    ['Upper', false],
    ['has space', false],
    ['under_score', false],
  ])('isValidSlug(%j) -> %s', (input, expected) => {
    expect(isValidSlug(input)).toBe(expected);
  });
});
