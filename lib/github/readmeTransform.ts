import type { Element, ElementContent, Root, RootContent } from 'hast';

export type ReadmeContext = {
  owner: string;
  repo: string;
  branch: string;
  /** Repo-relative path of the README itself, e.g. `README.md` or `docs/README.md`. */
  readmePath: string;
  /** Relative images in private repos can't load from raw.githubusercontent.com without auth. */
  isPrivate: boolean;
};

const BADGE_HOSTS = new Set([
  'img.shields.io',
  'shields.io',
  'badgen.net',
  'flat.badgen.net',
  'badge.fury.io',
  'travis-ci.org',
  'travis-ci.com',
  'circleci.com',
  'codecov.io',
  'coveralls.io',
  'snyk.io',
  'deepscan.io',
  'app.codacy.com',
  'api.codeclimate.com',
  'api.netlify.com',
  'forthebadge.com',
]);

const BADGE_PATH = /\/badges?(\/|\.svg|$)|\/badge\.svg|\/deploy-status/i;

function isAbsoluteUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');
}

export function isBadgeUrl(url: string): boolean {
  if (!isAbsoluteUrl(url)) return false;
  try {
    const parsed = new URL(url.startsWith('//') ? `https:${url}` : url);
    return BADGE_HOSTS.has(parsed.hostname) || BADGE_PATH.test(parsed.pathname);
  } catch {
    return false;
  }
}

/** Resolves a README-relative URL to a repo-root path (no leading slash), keeping any ?query/#hash. */
function resolveRepoPath(url: string, readmePath: string): string {
  const readmeDir = readmePath.includes('/') ? readmePath.slice(0, readmePath.lastIndexOf('/') + 1) : '';
  const base = new URL(`https://repo.invalid/${readmeDir}`);
  const resolved = new URL(url, base);
  return `${resolved.pathname.replace(/^\//, '')}${resolved.search}${resolved.hash}`;
}

/** Rewrites a relative image src to raw.githubusercontent.com. Absolute URLs are returned unchanged. */
export function resolveImageUrl(src: string, ctx: ReadmeContext): string {
  if (!src || isAbsoluteUrl(src) || src.startsWith('#')) return src;
  return `https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/${ctx.branch}/${resolveRepoPath(src, ctx.readmePath)}`;
}

/** Rewrites a relative link to its github.com blob URL. Absolute URLs and #anchors are returned unchanged. */
export function resolveLinkUrl(href: string, ctx: ReadmeContext): string {
  if (!href || isAbsoluteUrl(href) || href.startsWith('#')) return href;
  return `https://github.com/${ctx.owner}/${ctx.repo}/blob/${ctx.branch}/${resolveRepoPath(href, ctx.readmePath)}`;
}

function isRepoRawUrl(src: string, ctx: ReadmeContext): boolean {
  return src.startsWith(`https://raw.githubusercontent.com/${ctx.owner}/${ctx.repo}/`);
}

function shouldDropImage(src: string, ctx: ReadmeContext): boolean {
  if (!src) return true;
  if (isBadgeUrl(src)) return true;
  // Private-repo assets need auth that the visitor's browser doesn't have.
  return ctx.isPrivate && (!isAbsoluteUrl(src) || isRepoRawUrl(src, ctx));
}

function hasVisibleContent(node: ElementContent): boolean {
  if (node.type === 'text') return node.value.trim().length > 0;
  if (node.type === 'element') return node.tagName === 'img' || node.children.some(hasVisibleContent);
  return false;
}

function transformChildren<T extends RootContent | ElementContent>(children: T[], ctx: ReadmeContext): T[] {
  const result: T[] = [];
  for (const child of children) {
    if (child.type !== 'element') {
      result.push(child);
      continue;
    }
    const element = child as Element;

    if (element.tagName === 'img') {
      const src = String(element.properties.src ?? '');
      if (shouldDropImage(src, ctx)) continue;
      element.properties.src = resolveImageUrl(src, ctx);
      result.push(child);
      continue;
    }

    if (element.tagName === 'source' && typeof element.properties.srcSet === 'string') {
      element.properties.srcSet = resolveImageUrl(element.properties.srcSet, ctx);
    }

    element.children = transformChildren(element.children, ctx);

    if (element.tagName === 'a') {
      // A link that only wrapped badge images is now empty — drop it too.
      if (!element.children.some(hasVisibleContent)) continue;
      const href = element.properties.href;
      if (typeof href === 'string') element.properties.href = resolveLinkUrl(href, ctx);
    }

    result.push(child);
  }
  return result;
}

/**
 * rehype plugin: makes a GitHub README render correctly off-GitHub. Runs on
 * the HTML tree (after rehype-raw) so markdown and inline-HTML images/links are
 * handled the same way:
 * - relative image srcs -> raw.githubusercontent.com (dropped for private repos)
 * - relative links -> github.com/{owner}/{repo}/blob/{branch}/...
 * - badge/shield images (and links left empty without them) are removed
 * - absolute URLs and #anchors are left alone
 */
export function rehypeGitHubReadme(ctx: ReadmeContext) {
  return (tree: Root) => {
    tree.children = transformChildren(tree.children, ctx);
  };
}
