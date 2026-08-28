import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectPlaceholderIcon } from './ProjectPlaceholderIcon';

describe('ProjectPlaceholderIcon', () => {
  it('renders an svg icon styled with the gray-400 text color', () => {
    const { container } = render(<ProjectPlaceholderIcon />);
    const icon = container.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass('text-gray-400');
  });

  it('renders exactly one icon and no extraneous content', () => {
    const { container } = render(<ProjectPlaceholderIcon />);
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBe(1);
  });

  it('centers the icon in an absolutely-positioned, container-query-sized wrapper', () => {
    const { container } = render(<ProjectPlaceholderIcon />);
    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveClass(
      'absolute',
      'inset-0',
      'flex',
      'items-center',
      'justify-center',
    );
    expect(wrapper).toHaveStyle({ containerType: 'size' });
  });

  it('sizes the icon to 70% of the smaller container-query dimension via cqmin, not a fixed pixel value', () => {
    // jsdom's CSSStyleDeclaration can silently drop unrecognized values (as it
    // does for `clamp()` elsewhere in this codebase's tests), so the raw SSR
    // markup is asserted instead of reading the value back off the live DOM.
    const html = renderToStaticMarkup(<ProjectPlaceholderIcon />);
    const svgMatches = [...html.matchAll(/<svg[^>]*style="([^"]*)"[^>]*>/g)];
    expect(svgMatches.length).toBeGreaterThan(0);
    svgMatches.forEach(([, style]) => {
      expect(style).toMatch(/width:70cqmin/);
      expect(style).toMatch(/height:70cqmin/);
    });
  });

  it('takes no props', () => {
    expect(ProjectPlaceholderIcon.length).toBe(0);
  });
});
