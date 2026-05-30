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

      {/* Single overlay: fades all four edges simultaneously */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: [
            'linear-gradient(to bottom, var(--bg) 0%, transparent 22%, transparent 78%, var(--bg) 100%)',
            'linear-gradient(to right,  var(--bg) 0%, transparent 10%, transparent 90%, var(--bg) 100%)',
          ].join(', '),
        }}
      />
    </div>
  );
}
