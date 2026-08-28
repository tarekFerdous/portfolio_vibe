import { Image as ImageIcon } from 'lucide-react';

/**
 * Placeholder glyph shown inside a project card's color panel when there is
 * no photo. Fixed and non-parameterized — always the same icon, so it takes
 * no props.
 *
 * Assumes its parent panel is `position: relative`, the same assumption the
 * panels already make for the `next/image` `fill` overlay: this component
 * fills that parent via `absolute inset-0` and centers the icon inside it.
 *
 * Sized with CSS container query units rather than a fixed pixel value so it
 * resolves correctly per-panel at every breakpoint — both the short
 * mobile/medium strip (`h-[20vh]`, min 150px, full width) and the taller
 * desktop half-panel (`lg:h-[480px]`, ~half card width). `containerType:
 * 'size'` turns this element into a query container along both axes, and the
 * `cqmin` unit is 1% of whichever of that container's width/height is
 * smaller — so `70cqmin` is exactly "70% of the smaller of the panel's
 * width/height".
 */
export function ProjectPlaceholderIcon() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ containerType: 'size' }}
    >
      <ImageIcon
        aria-hidden="true"
        className="text-gray-400"
        style={{ width: '70cqmin', height: '70cqmin' }}
      />
    </div>
  );
}
