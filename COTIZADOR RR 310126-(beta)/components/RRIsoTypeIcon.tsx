import React from 'react';

const RRIsoTypeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    viewBox="0 0 52 36" 
    xmlns="http://www.w3.org/2000/svg"
    aria-label="RR Etiquetas Isotipo"
  >
    <defs>
      <linearGradient id="logoGradientIso" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
      </linearGradient>
    </defs>
    <g fill="url(#logoGradientIso)">
      {/* First 'R' */}
      <path d="M0 0 H8 V6 H14 V0 H22 V36 H14 V24 H8 V36 H0 V0 Z M8 12 V18 H14 V12 H8 Z" />
      {/* Second 'R' */}
      <path d="M28 0 H36 V6 H42 V0 H50 V36 H42 V24 H36 V36 H28 V0 Z M36 12 V18 H42 V12 H36 Z" />
    </g>
  </svg>
);

export default RRIsoTypeIcon;
