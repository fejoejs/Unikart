import React from 'react';

/**
 * UNIKART Official Brand Logo Component
 * 
 * Supports:
 * - variant="horizontal" | "dark": White UNI + Red KART for dark headers
 * - variant="light": Charcoal UNI + Red KART for white surfaces
 * - variant="icon": Standalone U-Cart emblem
 * - variant="app-icon": Squircle mobile icon
 */
export default function UnikartLogo({
  variant = 'horizontal',
  size = 'md',
  showTagline = false,
  className = ''
}) {
  const sizeMap = {
    sm: { height: 28, emblemSize: 26, fontSize: 18, taglineSize: 7 },
    md: { height: 38, emblemSize: 34, fontSize: 24, taglineSize: 8 },
    lg: { height: 48, emblemSize: 44, fontSize: 30, taglineSize: 10 },
    xl: { height: 64, emblemSize: 58, fontSize: 40, taglineSize: 12 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const isLight = variant === 'light';

  const CartSvg = ({ s = currentSize.emblemSize }) => (
    <svg
      viewBox="0 0 100 100"
      width={s}
      height={s}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform group-hover:scale-105"
      aria-label="UNIKART Cart Emblem"
    >
      {/* Top Arched Handle */}
      <path
        d="M35 32 C35 15, 65 15, 65 32"
        stroke="#E31837"
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Basket / Cart Contour */}
      <path
        d="M23 34 H77 C80 34 82 36.8 81.2 39.8 L74.2 68.5 C72.8 74.2 67.8 78 62 78 H38 C32.2 78 27.2 74.2 25.8 68.5 L18.8 39.8 C18 36.8 20 34 23 34 Z"
        stroke="#E31837"
        strokeWidth="7.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bottom Wheels */}
      <circle cx="36" cy="90" r="6" fill="#E31837" />
      <circle cx="36" cy="90" r="2.5" fill="#FFFFFF" />
      <circle cx="64" cy="90" r="6" fill="#E31837" />
      <circle cx="64" cy="90" r="2.5" fill="#FFFFFF" />
    </svg>
  );

  if (variant === 'icon') {
    return <CartSvg />;
  }

  if (variant === 'app-icon') {
    return (
      <div
        className={`relative rounded-2xl bg-[#1E1E1E] p-2.5 flex items-center justify-center shadow-lg border border-white/10 ${className}`}
        style={{ width: currentSize.emblemSize * 1.5, height: currentSize.emblemSize * 1.5 }}
      >
        <CartSvg s={currentSize.emblemSize} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <CartSvg />
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center tracking-tight font-black" style={{ fontSize: currentSize.fontSize }}>
          <span className={isLight ? 'text-[#252525]' : 'text-white'} style={{ color: isLight ? '#252525' : '#FFFFFF' }}>UNI</span>
          <span className="text-[#E31837]" style={{ color: '#E31837' }}>KART</span>
        </div>
        {showTagline && (
          <span
            className={`font-bold tracking-[0.2em] uppercase mt-0.5 ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`}
            style={{ fontSize: currentSize.taglineSize }}
          >
            Your World. One Marketplace.
          </span>
        )}
      </div>
    </div>
  );
}

export { UnikartLogo };
