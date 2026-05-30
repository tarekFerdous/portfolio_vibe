export function SvgDefs() {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      <defs>
        <clipPath id="squircle" clipPathUnits="objectBoundingBox">
          <path d="M 0.5,0 C 0.732,0 0.847,0 0.924,0.076 C 1,0.153 1,0.268 1,0.5 C 1,0.732 1,0.847 0.924,0.924 C 0.847,1 0.732,1 0.5,1 C 0.268,1 0.153,1 0.076,0.924 C 0,0.847 0,0.732 0,0.5 C 0,0.268 0,0.153 0.076,0.076 C 0.153,0 0.268,0 0.5,0 Z" />
        </clipPath>
        <filter id="liquid-glass" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="turbulence" />
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="18" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
