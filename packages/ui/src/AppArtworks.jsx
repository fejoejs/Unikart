// packages/ui/src/AppArtworks.jsx - Vector Artworks for Retained UNIKART Applications (Admin & Inventory)
import React from 'react';

/**
 * Admin Governance Artwork:
 * Executive topology network, root shield, audit chain, and governance node.
 */
export function AdminArtwork() {
  return (
    <div className="w-full max-w-sm mx-auto my-4 relative flex items-center justify-center p-2">
      <svg viewBox="0 0 400 220" className="w-full h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="saGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8173D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#F34B7A" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="saCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8173D" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#252525" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient Ring */}
        <circle cx="200" cy="110" r="85" stroke="#333333" strokeWidth="1.5" strokeDasharray="4 4" />
        <circle cx="200" cy="110" r="60" stroke="#E8173D" strokeWidth="1" strokeOpacity="0.4" />
        <circle cx="200" cy="110" r="100" fill="url(#saCore)" />

        {/* Outer App Connection Nodes */}
        <line x1="200" y1="110" x2="100" y2="50" stroke="#444444" strokeWidth="1.5" />
        <line x1="200" y1="110" x2="300" y2="50" stroke="#444444" strokeWidth="1.5" />
        <line x1="200" y1="110" x2="70" y2="110" stroke="#444444" strokeWidth="1.5" />
        <line x1="200" y1="110" x2="330" y2="110" stroke="#444444" strokeWidth="1.5" />

        {/* Satellites */}
        <g transform="translate(90, 40)">
          <rect width="20" height="20" rx="6" fill="#1F1F1F" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="4" fill="#0284C7" />
        </g>
        <g transform="translate(290, 40)">
          <rect width="20" height="20" rx="6" fill="#1F1F1F" stroke="#16A34A" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="4" fill="#16A34A" />
        </g>
        <g transform="translate(60, 100)">
          <rect width="20" height="20" rx="6" fill="#1F1F1F" stroke="#0284C7" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="4" fill="#0284C7" />
        </g>
        <g transform="translate(320, 100)">
          <rect width="20" height="20" rx="6" fill="#1F1F1F" stroke="#DC2626" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="4" fill="#DC2626" />
        </g>

        {/* Central Shield Embellishment */}
        <g transform="translate(170, 75)">
          <rect width="60" height="70" rx="14" fill="#1E1E1E" stroke="url(#saGlow)" strokeWidth="2" />
          {/* Shield Icon */}
          <path d="M30 18 L46 25 V42 C46 51 39 57 30 60 C21 57 14 51 14 42 V25 L30 18 Z" fill="#E8173D" fillOpacity="0.2" stroke="#E8173D" strokeWidth="1.5" />
          <path d="M26 38 L29 41 L35 34" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Pulse Dot */}
        <circle cx="200" cy="110" r="3" fill="#FFFFFF" />
      </svg>
    </div>
  );
}

/**
 * Inventory Artwork:
 * 3D Warehouse Pallet Grid, Stock Threshold Radial Gauges, Live Barcode Laser Beam.
 */
export function InventoryArtwork() {
  return (
    <div className="w-full max-w-sm mx-auto my-4 relative flex items-center justify-center p-2">
      <svg viewBox="0 0 400 220" className="w-full h-auto drop-shadow-xl" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="invBeam" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0" />
            <stop offset="50%" stopColor="#E8173D" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="boxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2E2E2E" />
            <stop offset="100%" stopColor="#1C1C1C" />
          </linearGradient>
        </defs>

        {/* Grid floor */}
        <line x1="50" y1="180" x2="350" y2="180" stroke="#333333" strokeWidth="1.5" />
        <line x1="80" y1="160" x2="320" y2="160" stroke="#2A2A2A" strokeWidth="1" strokeDasharray="3 3" />

        {/* Pallet Stacks */}
        {/* Box 1 (Left) */}
        <g transform="translate(90, 110)">
          <rect width="60" height="60" rx="8" fill="url(#boxGrad)" stroke="#444444" strokeWidth="1.5" />
          <line x1="10" y1="130" x2="50" y2="130" stroke="#0284C7" strokeWidth="2" />
          <rect x="12" y="15" width="36" height="4" rx="2" fill="#0284C7" fillOpacity="0.7" />
          <rect x="12" y="25" width="24" height="4" rx="2" fill="#555555" />
          <text x="12" y="46" fill="#888888" fontSize="10" fontFamily="monospace">FEFO-01</text>
        </g>

        {/* Box 2 (Center - Active Scanned) */}
        <g transform="translate(170, 80)">
          <rect width="70" height="90" rx="10" fill="#1F1F1F" stroke="#0284C7" strokeWidth="2" />
          <rect x="14" y="20" width="42" height="6" rx="3" fill="#0284C7" />
          <rect x="14" y="34" width="30" height="4" rx="2" fill="#555555" />
          
          {/* Barcode lines */}
          <line x1="16" y1="48" x2="16" y2="68" stroke="#FFFFFF" strokeWidth="2" />
          <line x1="22" y1="48" x2="22" y2="68" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="26" y1="48" x2="26" y2="68" stroke="#FFFFFF" strokeWidth="3" />
          <line x1="33" y1="48" x2="33" y2="68" stroke="#FFFFFF" strokeWidth="1.5" />
          <line x1="39" y1="48" x2="39" y2="68" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="46" y1="48" x2="46" y2="68" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="52" y1="48" x2="52" y2="68" stroke="#FFFFFF" strokeWidth="2" />

          {/* Laser Scan Beam */}
          <line x1="-15" y1="58" x2="85" y2="58" stroke="url(#invBeam)" strokeWidth="2.5" />
          <circle cx="35" cy="58" r="3" fill="#E8173D" />

          <text x="16" y="80" fill="#0284C7" fontSize="9" fontWeight="bold" fontFamily="monospace">98% IN-STOCK</text>
        </g>

        {/* Box 3 (Right) */}
        <g transform="translate(260, 120)">
          <rect width="55" height="50" rx="8" fill="url(#boxGrad)" stroke="#444444" strokeWidth="1.5" />
          <rect x="10" y="15" width="30" height="4" rx="2" fill="#555555" />
          <circle cx="40" cy="35" r="4" fill="#16A34A" />
        </g>

        {/* Radial Reorder Gauge Graphic (Floating) */}
        <g transform="translate(290, 40)">
          <circle cx="25" cy="25" r="22" stroke="#333333" strokeWidth="3" fill="#1F1F1F" />
          <circle cx="25" cy="25" r="22" stroke="#E8173D" strokeWidth="3" strokeDasharray="100" strokeDashoffset="40" strokeLinecap="round" />
          <text x="25" y="28" fill="#FFFFFF" fontSize="10" fontWeight="bold" textAnchor="middle">AI</text>
          <text x="25" y="36" fill="#888888" fontSize="7" textAnchor="middle">REORDER</text>
        </g>
      </svg>
    </div>
  );
}
