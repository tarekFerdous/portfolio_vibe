export function BackgroundGrid() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: -10, pointerEvents: 'none' }}
    >
      {/* Grid lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: [
            'linear-gradient(to right, var(--grid-line) 1px, transparent 1px)',
            'linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: 'var(--grid-size) var(--grid-size)',
        }}
      />

      {/* Edge fade overlays — gradient from bg color to transparent */}
      <div style={{ position: 'absolute', inset: 0, top: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(to bottom, var(--bg), transparent)' }} />
      <div style={{ position: 'absolute', inset: 0, bottom: 0, left: 0, right: 0, height: '22%', background: 'linear-gradient(to top, var(--bg), transparent)' }} />
      <div style={{ position: 'absolute', inset: 0, top: 0, bottom: 0, left: 0, width: '10%', background: 'linear-gradient(to right, var(--bg), transparent)' }} />
      <div style={{ position: 'absolute', inset: 0, top: 0, bottom: 0, right: 0, width: '10%', background: 'linear-gradient(to left, var(--bg), transparent)' }} />
    </div>
  );
}
