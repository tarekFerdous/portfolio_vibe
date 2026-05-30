import type { CSSProperties, ReactNode } from 'react';

interface SquircleWrapProps {
  children: ReactNode;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function SquircleWrap({ children, size, className = '', style }: SquircleWrapProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        ...(size !== undefined ? { width: size, height: size } : {}),
        clipPath: 'url(#squircle)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
