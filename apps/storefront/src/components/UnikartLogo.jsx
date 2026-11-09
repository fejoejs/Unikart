import React from 'react';

/**
 * UNIKART Official Brand Logo
 * 
 * Matches exact brand identity from official design:
 * - Red shopping cart/basket contour with arched top handle and dual wheels
 * - Bold white "UNI" and bold red "KART" (#E31837)
 * - Clean, modern vector presentation
 */
export default function UnikartLogo({
  variant = 'white', // 'white' | 'light' | 'symbol' | 'app-icon'
  showTagline = false,
  className = '',
  iconSize = 34
}) {
  // Standalone vector symbol SVG matching the brand cart mark
  const CartEmblem = ({ size = iconSize, light = false }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      aria-label="UNIKART Symbol"
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
      <circle cx="36" cy="90" r="2.5" fill={light ? '#FFFFFF' : '#FFFFFF'} />
      <circle cx="64" cy="90" r="6" fill="#E31837" />
      <circle cx="64" cy="90" r="2.5" fill={light ? '#FFFFFF' : '#FFFFFF'} />
    </svg>
  );

  // App icon variation (square rounded container)
  if (variant === 'app-icon') {
    return (
      <div
        className={`relative rounded-2xl bg-[#1E1E1E] p-2 flex items-center justify-center shadow-lg border border-white/10 ${className}`}
        style={{ width: iconSize * 1.4, height: iconSize * 1.4 }}
      >
        <CartEmblem size={iconSize} />
      </div>
    );
  }

  // Symbol only
  if (variant === 'symbol') {
    return <CartEmblem size={iconSize} light={false} />;
  }

  // Light wordmark on light background (e.g., invoices, checkout, white bars)
  if (variant === 'light') {
    return (
      <div className={`flex items-center gap-2.5 select-none ${className}`}>
        <CartEmblem size={iconSize} light={true} />
        <div className="flex flex-col justify-center">
          <div className="flex items-center tracking-tight leading-none">
            <span className="text-xl md:text-2xl font-black text-[#252525] font-sans tracking-tight">
              UNI<span className="text-[#E31837]">KART</span>
            </span>
          </div>
          {showTagline && (
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mt-0.5">
              Your World. One Marketplace.
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: White wordmark on dark background (Header, Footer, Dark Banners)
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <CartEmblem size={iconSize} light={false} />
      <div className="flex flex-col justify-center">
        <div className="flex items-center tracking-tight leading-none">
          <span className="text-xl md:text-2xl font-black text-white font-sans tracking-tight">
            UNI<span className="text-[#E31837]">KART</span>
          </span>
        </div>
        {showTagline && (
          <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">
            Your World. One Marketplace.
          </span>
        )}
      </div>
    </div>
  );
}
export { UnikartLogo };
