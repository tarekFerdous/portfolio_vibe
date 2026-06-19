import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploadZone } from './ImageUploadZone';

const mockFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
const UPLOADED_URL = 'https://example.com/photo.jpg';

function makeProps(overrides = {}) {
  return {
    onUpload: vi.fn().mockResolvedValue(UPLOADED_URL),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('ImageUploadZone', () => {
  it('calls onUpload when a file is selected via file picker', async () => {
    const props = makeProps();
    render(<ImageUploadZone {...props} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });
    await waitFor(() => expect(props.onUpload).toHaveBeenCalledWith(mockFile));
  });

  it('calls onUpload when a file is dropped onto the zone', async () => {
    const props = makeProps();
    render(<ImageUploadZone {...props} />);
    const zone = screen.getByRole('button', { name: /upload image/i });
    fireEvent.drop(zone, { dataTransfer: { files: [mockFile] } });
    await waitFor(() => expect(props.onUpload).toHaveBeenCalledWith(mockFile));
  });

  it('shows a preview image after onUpload resolves', async () => {
    const props = makeProps();
    render(<ImageUploadZone {...props} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });
    await waitFor(() => expect(screen.getByRole('img', { name: /uploaded image/i })).toBeInTheDocument());
  });

  it('shows loading state while uploading', async () => {
    let resolve!: (url: string) => void;
    const onUpload = vi.fn().mockReturnValue(new Promise<string>((r) => { resolve = r; }));
    render(<ImageUploadZone onUpload={onUpload} onDelete={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [mockFile] } });
    expect(await screen.findByText('Uploading…')).toBeInTheDocument();
    resolve(UPLOADED_URL);
  });

  it('calls onDelete with the current URL when delete button is clicked', async () => {
    const props = makeProps({ currentUrl: UPLOADED_URL });
    render(<ImageUploadZone {...props} />);
    const deleteBtn = screen.getByRole('button', { name: /delete image/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(props.onDelete).toHaveBeenCalledWith(UPLOADED_URL));
  });

  it('removes the preview after deletion', async () => {
    const props = makeProps({ currentUrl: UPLOADED_URL });
    render(<ImageUploadZone {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /delete image/i }));
    await waitFor(() => expect(screen.queryByRole('img', { name: /uploaded image/i })).not.toBeInTheDocument());
  });
});
