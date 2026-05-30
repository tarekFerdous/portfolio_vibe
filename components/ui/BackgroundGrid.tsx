export function BackgroundGrid() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -10,
        pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(to right, var(--grid-line) 1px, transparent 1px)',
          'linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'var(--grid-size) var(--grid-size)',
        WebkitMaskImage: [
          'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        ].join(', '),
        WebkitMaskComposite: 'destination-in',
        maskImage: [
          'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)',
          'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        ].join(', '),
        maskComposite: 'intersect',
      }}
    />
  );
}
