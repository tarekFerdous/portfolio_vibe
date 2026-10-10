import type { CSSProperties } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { rehypeGitHubReadme, type ReadmeContext } from '@/lib/github/readmeTransform';

interface ProjectReadmeProps {
  markdown: string;
  context: ReadmeContext;
}

const GLASS_PANEL: CSSProperties = {
  backdropFilter: 'var(--intro-glass-filter)',
  WebkitBackdropFilter: 'var(--intro-glass-filter)',
  background: 'var(--intro-glass-bg)',
  border: '1px solid var(--intro-glass-border)',
  boxShadow: 'var(--intro-glass-shadow)',
};

const HEADING_FONT: CSSProperties = { fontFamily: 'var(--font-barlow-condensed)', fontWeight: 100, lineHeight: 1.1 };

const MONO_FONT: CSSProperties = {
  fontFamily: 'var(--font-recursive)',
  fontVariationSettings: "'MONO' 1, 'CASL' 0, 'wght' 400, 'slnt' 0, 'CRSV' 0",
};

const HEADING_SIZES = { h1: '48px', h2: '38px', h3: '30px', h4: '24px', h5: '20px', h6: '18px' } as const;

function heading(tag: keyof typeof HEADING_SIZES): Components[typeof tag] {
  const Tag = tag;
  return function Heading({ node: _node, ...props }) {
    return (
      <Tag
        {...props}
        data-readme-heading=""
        className="mt-10 mb-4 first:mt-0 text-gray-900 dark:text-gray-50"
        style={{ ...HEADING_FONT, fontSize: HEADING_SIZES[tag] }}
      />
    );
  };
}

const components: Components = {
  h1: heading('h1'),
  h2: heading('h2'),
  h3: heading('h3'),
  h4: heading('h4'),
  h5: heading('h5'),
  h6: heading('h6'),
  p: ({ node: _node, ...props }) => <p {...props} className="my-4" />,
  a: ({ node: _node, ...props }) => (
    <a
      {...props}
      className="underline underline-offset-2 text-gray-900 dark:text-gray-50 hover:opacity-70 transition-opacity break-words"
      target={props.href?.startsWith('#') ? undefined : '_blank'}
      rel={props.href?.startsWith('#') ? undefined : 'noopener noreferrer'}
    />
  ),
  ul: ({ node: _node, ...props }) => <ul {...props} className="my-4 pl-6 list-disc space-y-1 [&_ul]:my-1 [&_ol]:my-1" />,
  ol: ({ node: _node, ...props }) => <ol {...props} className="my-4 pl-6 list-decimal space-y-1 [&_ul]:my-1 [&_ol]:my-1" />,
  li: ({ node: _node, ...props }) => <li {...props} className="[&.task-list-item]:list-none [&.task-list-item]:-ml-6" />,
  input: ({ node: _node, ...props }) => <input {...props} className="mr-2 align-middle accent-gray-900 dark:accent-gray-50" />,
  hr: ({ node: _node, ...props }) => <hr {...props} className="my-8 border-black/[0.08] dark:border-white/[0.08]" />,
  img: ({ node: _node, alt, ...props }) => (
    // README images come from arbitrary hosts with unknown dimensions, so next/image doesn't fit here.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={alt ?? ''} loading="lazy" className="inline-block max-w-full h-auto rounded-[24px]" />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      {...props}
      data-readme-code=""
      className="rounded-md px-1.5 py-0.5 text-[0.9em] bg-black/[0.06] dark:bg-white/[0.08]"
      style={MONO_FONT}
    />
  ),
  pre: ({ node: _node, ...props }) => (
    <pre
      {...props}
      data-readme-panel=""
      className="my-6 overflow-x-auto rounded-[20px] p-5 text-sm leading-relaxed [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]"
      style={{ ...GLASS_PANEL, ...MONO_FONT }}
    />
  ),
  blockquote: ({ node: _node, ...props }) => (
    <blockquote
      {...props}
      data-readme-panel=""
      className="my-6 rounded-[20px] px-6 py-2 text-gray-600 dark:text-gray-400"
      style={GLASS_PANEL}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div data-readme-panel="" className="my-6 overflow-x-auto rounded-[20px]" style={GLASS_PANEL}>
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th {...props} className="px-4 py-3 text-left font-semibold border-b border-black/[0.08] dark:border-white/[0.08]" />
  ),
  td: ({ node: _node, ...props }) => (
    <td {...props} className="px-4 py-3 align-top border-b border-black/[0.04] dark:border-white/[0.04]" />
  ),
  details: ({ node: _node, ...props }) => (
    <details {...props} className="my-4 rounded-[20px] px-5 py-3" style={GLASS_PANEL} />
  ),
  summary: ({ node: _node, ...props }) => <summary {...props} className="cursor-pointer font-semibold" />,
};

/**
 * Renders a GitHub README with the site's own typography and glass panels
 * rather than GitHub's look. Raw HTML is allowed but sanitized (GitHub's
 * allow-list), and relative URLs/badges are fixed up by rehypeGitHubReadme.
 */
export function ProjectReadme({ markdown, context }: ProjectReadmeProps) {
  return (
    <article
      className="text-gray-800 dark:text-gray-200 leading-relaxed break-words"
      style={{
        fontFamily: 'var(--font-recursive)',
        fontVariationSettings: "'MONO' 0, 'CASL' 0, 'wght' 400, 'slnt' 0, 'CRSV' 0.5",
        fontSize: '13pt',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeGitHubReadme, context], rehypeSanitize]}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
