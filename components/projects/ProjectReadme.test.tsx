import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectReadme } from './ProjectReadme';
import type { ReadmeContext } from '@/lib/github/readmeTransform';

const ctx: ReadmeContext = { owner: 'o', repo: 'r', branch: 'main', readmePath: 'README.md', isPrivate: false };

function renderReadme(markdown: string, context: ReadmeContext = ctx) {
  return render(<ProjectReadme markdown={markdown} context={context} />);
}

describe('ProjectReadme', () => {
  it('renders GFM tables as styled tables on a glass panel', () => {
    const { container } = renderReadme('| Name | Value |\n| --- | --- |\n| a | 1 |');
    const table = screen.getByRole('table');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '1' })).toBeInTheDocument();
    expect(table.parentElement).toHaveAttribute('data-readme-panel');
    expect(container.querySelector('[data-readme-panel]')).not.toBeNull();
  });

  it('renders task lists and strikethrough', () => {
    const { container } = renderReadme('- [x] done\n- [ ] todo\n\n~~old~~');
    const boxes = container.querySelectorAll('input[type="checkbox"]');
    expect(boxes).toHaveLength(2);
    expect((boxes[0] as HTMLInputElement).checked).toBe(true);
    expect(container.querySelector('del')).toHaveTextContent('old');
  });

  it('styles headings with the site heading font and code with Recursive mono', () => {
    const { container } = renderReadme('# Title\n\nUse `npm i`.\n\n```\nconst a = 1;\n```');
    const heading = screen.getByRole('heading', { level: 1, name: 'Title' });
    expect(heading).toHaveAttribute('data-readme-heading');
    expect(heading.getAttribute('style')).toContain('--font-barlow-condensed');

    const codes = container.querySelectorAll('code');
    expect(codes).toHaveLength(2);
    codes.forEach((code) => expect(code.getAttribute('style')).toContain("'MONO' 1"));
    expect(container.querySelector('pre')).toHaveAttribute('data-readme-panel');
  });

  it('wraps blockquotes in a glass panel and underlines links', () => {
    renderReadme('> quoted\n\n[site](https://example.com)');
    expect(screen.getByText('quoted').closest('blockquote')).toHaveAttribute('data-readme-panel');
    const link = screen.getByRole('link', { name: 'site' });
    expect(link.className).toContain('underline');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('removes <script> tags and event-handler attributes from inline HTML', () => {
    const { container } = renderReadme(
      '<script>alert(1)</script>\n\n<img src="https://example.com/a.png" alt="pic" onerror="alert(2)">\n\n<a href="javascript:alert(3)">bad</a>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('alert(1)');
    const img = screen.getByAltText('pic');
    expect(img).not.toHaveAttribute('onerror');
    expect(screen.getByText('bad').getAttribute('href') ?? '').not.toContain('javascript:');
  });

  it('renders safe inline HTML such as <p align>, <img>, and <details>', () => {
    const { container } = renderReadme(
      '<p align="center"><img src="./logo.png" alt="logo" width="120"></p>\n\n<details><summary>More</summary>\n\nHidden text\n\n</details>'
    );
    expect(container.querySelector('p[align="center"]')).not.toBeNull();
    expect(screen.getByAltText('logo')).toHaveAttribute('src', 'https://raw.githubusercontent.com/o/r/main/logo.png');
    expect(screen.getByText('More').closest('details')).not.toBeNull();
  });

  it('rewrites relative images and links in markdown, leaving anchors and absolute URLs alone', () => {
    renderReadme('![shot](./docs/shot.png)\n\n[guide](docs/guide.md) [top](#top) [ext](https://example.com/x)');
    expect(screen.getByAltText('shot')).toHaveAttribute('src', 'https://raw.githubusercontent.com/o/r/main/docs/shot.png');
    expect(screen.getByRole('link', { name: 'guide' })).toHaveAttribute('href', 'https://github.com/o/r/blob/main/docs/guide.md');
    expect(screen.getByRole('link', { name: 'top' }).getAttribute('href')).toMatch(/#top$/);
    expect(screen.getByRole('link', { name: 'ext' })).toHaveAttribute('href', 'https://example.com/x');
  });

  it('strips badge images and the links that only wrapped them', () => {
    renderReadme(
      '[![build](https://github.com/o/r/actions/workflows/ci.yml/badge.svg)](https://github.com/o/r/actions) ![license](https://img.shields.io/badge/license-MIT-blue)\n\nReal content'
    );
    expect(screen.queryByAltText('build')).toBeNull();
    expect(screen.queryByAltText('license')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Real content')).toBeInTheDocument();
  });

  it('drops relative images for private repos instead of rendering broken images', () => {
    renderReadme('![shot](./shot.png)\n\n![ext](https://example.com/a.png)', { ...ctx, isPrivate: true });
    expect(screen.queryByAltText('shot')).toBeNull();
    expect(screen.getByAltText('ext')).toBeInTheDocument();
  });

  it('rounds images to 24px', () => {
    renderReadme('![shot](https://example.com/a.png)');
    expect(screen.getByAltText('shot').className).toContain('rounded-[24px]');
  });
});

describe('ProjectReadme without a repo context (manual README)', () => {
  function renderManual(markdown: string) {
    return render(<ProjectReadme markdown={markdown} />).container;
  }

  it('shows a relative image as its alt text', () => {
    const container = renderManual('Before ![Architecture diagram](docs/arch.png) after');
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('Before Architecture diagram after');
  });

  it('drops a relative image with no alt text entirely', () => {
    const container = renderManual('![](./shot.png)\n\nText');
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent(/^Text$/);
  });

  it('keeps an absolute image', () => {
    renderManual('![ext](https://example.com/a.png)');
    expect(screen.getByAltText('ext')).toHaveAttribute('src', 'https://example.com/a.png');
  });

  it('turns a relative link into plain text', () => {
    const container = renderManual('See [the setup guide](docs/setup.md) for details.');
    expect(container.querySelector('a')).toBeNull();
    expect(container).toHaveTextContent('See the setup guide for details.');
  });

  it('turns relative links and images in raw HTML into text too', () => {
    const container = renderManual('<p><a href="CONTRIBUTING.md">Contributing</a> <img src="logo.png" alt="Logo"></p>');
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('Contributing Logo');
  });

  it('keeps absolute links and #anchors', () => {
    renderManual('[Site](https://example.com) and [Usage](#usage)');
    expect(screen.getByRole('link', { name: 'Site' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('link', { name: 'Usage' })).toHaveAttribute('href', '#usage');
  });

  it('never points anything at GitHub', () => {
    const container = renderManual('[a](src/index.ts) ![b](img/b.png)');
    expect(container.innerHTML).not.toContain('github');
  });

  it('still drops badges', () => {
    const container = renderManual('[![CI](https://img.shields.io/badge/ci-passing-green)](https://ci.example.com)\n\nReal content');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Real content')).toBeInTheDocument();
  });
});
