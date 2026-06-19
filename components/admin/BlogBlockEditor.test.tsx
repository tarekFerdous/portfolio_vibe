import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogBlockEditor, type Block } from './BlogBlockEditor';

function makeBlock(type: 'text' | 'photo', id = crypto.randomUUID()): Block {
  return type === 'text'
    ? { id, type: 'text', content: '' }
    : { id, type: 'photo', image_url: null };
}

function setup(initialBlocks: Block[] = []) {
  const onChange = vi.fn();
  render(
    <BlogBlockEditor
      blocks={initialBlocks}
      onChange={onChange}
      onImageUpload={vi.fn().mockResolvedValue('https://example.com/img.jpg')}
      onImageDelete={vi.fn().mockResolvedValue(undefined)}
    />
  );
  return { onChange };
}

function getInsertButtonPairs() {
  return screen.getAllByTestId('insert-buttons');
}

describe('BlogBlockEditor', () => {
  it('renders initial blocks in correct order', () => {
    const blocks = [makeBlock('text'), makeBlock('photo')];
    setup(blocks);
    const imgs = screen.queryAllByRole('img', { name: /uploaded image/i });
    // One text block (no img) and one photo block (ImageUploadZone without currentUrl shows no img)
    expect(imgs).toHaveLength(0);
    // Two blocks means 3 insert button pairs (before, between, after)
    expect(getInsertButtonPairs()).toHaveLength(3);
  });

  it('inserts a text block at index 0 when clicking first plus-text button', () => {
    const { onChange } = setup([]);
    const [firstPair] = getInsertButtonPairs();
    fireEvent.click(firstPair.querySelector('button:first-of-type')!);
    const [[calledWith]] = onChange.mock.calls;
    expect(calledWith).toHaveLength(1);
    expect(calledWith[0].type).toBe('text');
  });

  it('inserts a photo block at index 0 when clicking first plus-photo button', () => {
    const { onChange } = setup([]);
    const [firstPair] = getInsertButtonPairs();
    fireEvent.click(firstPair.querySelector('button:last-of-type')!);
    const [[calledWith]] = onChange.mock.calls;
    expect(calledWith).toHaveLength(1);
    expect(calledWith[0].type).toBe('photo');
  });

  it('inserts a text block between existing blocks at the correct index', () => {
    const a = makeBlock('text');
    const b = makeBlock('photo');
    const { onChange } = setup([a, b]);
    // 3 pairs: [0]=before a, [1]=between a and b, [2]=after b
    const pairs = getInsertButtonPairs();
    fireEvent.click(pairs[1].querySelector('button:first-of-type')!);
    const [[result]] = onChange.mock.calls;
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(a.id);
    expect(result[1].type).toBe('text');
    expect(result[2].id).toBe(b.id);
  });

  it('removes a block and preserves order of remaining blocks', () => {
    const a = makeBlock('text');
    const b = makeBlock('photo');
    const c = makeBlock('text');
    const { onChange } = setup([a, b, c]);
    // Delete button on second block (index 1 = b)
    const deleteBtns = screen.getAllByRole('button', { name: /delete block/i });
    fireEvent.click(deleteBtns[1]);
    const [[result]] = onChange.mock.calls;
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(a.id);
    expect(result[1].id).toBe(c.id);
  });

  it('inserts a photo block after the last block', () => {
    const a = makeBlock('text');
    const { onChange } = setup([a]);
    const pairs = getInsertButtonPairs();
    // Last pair = after a
    fireEvent.click(pairs[pairs.length - 1].querySelector('button:last-of-type')!);
    const [[result]] = onChange.mock.calls;
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(a.id);
    expect(result[1].type).toBe('photo');
  });
});
