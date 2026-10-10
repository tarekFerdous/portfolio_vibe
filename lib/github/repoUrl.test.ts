import { describe, it, expect } from 'vitest';
import { parseGitHubRepoUrl } from './repoUrl';

describe('parseGitHubRepoUrl', () => {
  it.each([
    ['https://github.com/tarekFerdous/Rhubarb', { owner: 'tarekFerdous', repo: 'Rhubarb' }],
    ['https://github.com/tarekFerdous/Rhubarb/', { owner: 'tarekFerdous', repo: 'Rhubarb' }],
    ['https://github.com/tarekFerdous/Rhubarb.git', { owner: 'tarekFerdous', repo: 'Rhubarb' }],
    ['https://www.github.com/tarekFerdous/Rhubarb', { owner: 'tarekFerdous', repo: 'Rhubarb' }],
    ['  https://github.com/a-b/c.d_e  ', { owner: 'a-b', repo: 'c.d_e' }],
  ])('parses %j', (input, expected) => {
    expect(parseGitHubRepoUrl(input)).toEqual(expected);
  });

  it.each([
    '',
    'not a url',
    'github.com/owner/repo',
    'https://gitlab.com/owner/repo',
    'https://github.com/owner',
    'https://github.com/owner/repo/tree/main',
    'https://github.com/owner/repo?tab=readme',
    'ftp://github.com/owner/repo',
    'https://evil.com/github.com/owner/repo',
  ])('rejects %j', (input) => {
    expect(parseGitHubRepoUrl(input)).toBeNull();
  });
});
