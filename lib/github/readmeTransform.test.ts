import { describe, it, expect } from 'vitest';
import { isBadgeUrl, resolveImageUrl, resolveLinkUrl, type ReadmeContext } from './readmeTransform';

const ctx: ReadmeContext = { owner: 'o', repo: 'r', branch: 'main', readmePath: 'README.md', isPrivate: false };

describe('resolveImageUrl', () => {
  it.each([
    ['./screenshot.png', 'https://raw.githubusercontent.com/o/r/main/screenshot.png'],
    ['docs/img/a.png', 'https://raw.githubusercontent.com/o/r/main/docs/img/a.png'],
    ['/assets/logo.svg', 'https://raw.githubusercontent.com/o/r/main/assets/logo.svg'],
  ])('rewrites relative image %s to a raw URL', (src, expected) => {
    expect(resolveImageUrl(src, ctx)).toBe(expected);
  });

  it('resolves paths relative to a README in a subfolder', () => {
    expect(resolveImageUrl('../img/a.png', { ...ctx, readmePath: 'docs/README.md' })).toBe(
      'https://raw.githubusercontent.com/o/r/main/img/a.png'
    );
  });

  it('leaves absolute URLs unchanged', () => {
    expect(resolveImageUrl('https://example.com/a.png', ctx)).toBe('https://example.com/a.png');
  });
});

describe('resolveLinkUrl', () => {
  it.each([
    ['CONTRIBUTING.md', 'https://github.com/o/r/blob/main/CONTRIBUTING.md'],
    ['./docs/setup.md#install', 'https://github.com/o/r/blob/main/docs/setup.md#install'],
  ])('rewrites relative link %s to a blob URL', (href, expected) => {
    expect(resolveLinkUrl(href, ctx)).toBe(expected);
  });

  it.each(['https://example.com', 'mailto:a@b.c', '#installation'])('leaves %s unchanged', (href) => {
    expect(resolveLinkUrl(href, ctx)).toBe(href);
  });
});

describe('isBadgeUrl', () => {
  it.each([
    'https://img.shields.io/badge/license-MIT-blue.svg',
    'https://badgen.net/npm/v/express',
    'https://github.com/o/r/actions/workflows/ci.yml/badge.svg',
    'https://codecov.io/gh/o/r/branch/main/graph/badge.svg',
    'https://api.netlify.com/api/v1/badges/123/deploy-status',
  ])('detects %s as a badge', (url) => {
    expect(isBadgeUrl(url)).toBe(true);
  });

  it.each(['https://example.com/screenshot.png', './badge.svg', 'https://raw.githubusercontent.com/o/r/main/a.png'])(
    'does not treat %s as a badge',
    (url) => {
      expect(isBadgeUrl(url)).toBe(false);
    }
  );
});
