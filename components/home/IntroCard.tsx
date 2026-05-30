import Image from 'next/image';
import { colors } from '@/lib/colors';

const AVATAR_SIZE = 110;
const AVATAR_HALF = AVATAR_SIZE / 2;
const CARD_TOP_PADDING = AVATAR_HALF + 18; // half avatar inside + breathing room

export function IntroCard() {
  return (
    <section
      style={{
        position: 'relative',
        width: '70vw',
        maxWidth: '600px',
        margin: '0 auto',
        overflow: 'visible',
      }}
    >
      {/* Avatar — half above, half inside card */}
      <div
        style={{
          position: 'absolute',
          top: -AVATAR_HALF,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}
      >
        <Image
          src="/avatar.jpg"
          alt="Tarek Ferdous"
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          priority
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            objectPosition: 'top',
            boxShadow: '0 0 0 4px rgba(128, 128, 128, 0.25)',
            display: 'block',
          }}
        />
      </div>

      {/* Card wrapper — height comes from content, overflow hidden clips filter halo */}
      <div style={{ position: 'relative', paddingTop: CARD_TOP_PADDING, overflow: 'hidden' }}>
        {/* Liquid glass layer — absolute, clips to squircle */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: 'url(#squircle)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            filter: 'url(#liquid-glass)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
          }}
        />

        {/* Content — unaffected by glass filter */}
        <div
          style={{ position: 'relative', zIndex: 1, padding: '0 28px 36px' }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mt-1">
            Tarek Ferdous
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation.
          </p>

          <button
            style={{
              marginTop: 20,
              clipPath: 'url(#squircle)',
              backgroundColor: colors.hireMeGreen,
              color: colors.hireMeText,
              padding: '10px 28px',
              fontWeight: 900,
              fontSize: '0.875rem',
              cursor: 'pointer',
              border: 'none',
              display: 'inline-block',
            }}
          >
            View Resume
          </button>
        </div>
      </div>
    </section>
  );
}
