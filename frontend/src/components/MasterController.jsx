import { forwardRef } from 'react';

/**
 * MasterController
 * A four-layer SVG that GSAP assembles during the pinned hero scroll.
 * Layers: outer-frame, glowing-core, control-buttons, energy-cells.
 * Each layer is given a stable id so GSAP can target it directly.
 */
const MasterController = forwardRef(function MasterController(_props, ref) {
  return (
    <svg
      ref={ref}
      className="hp-controller"
      viewBox="0 0 720 420"
      role="img"
      aria-label="Gametime master controller"
    >
      <defs>
        {/* Soft red glow for the core */}
        <radialGradient id="hp-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5a5a" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#dc2626" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>

        {/* Frame metallic gradient */}
        <linearGradient id="hp-frame-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#e7e7ea" />
          <stop offset="100%" stopColor="#cfcfd4" />
        </linearGradient>

        {/* Inner inset shadow for the screen / core well */}
        <linearGradient id="hp-screen-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>

        {/* Energy cell gradient */}
        <linearGradient id="hp-cell-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>

      {/* ── Layer 1: outer-frame ─────────────────────────────────────── */}
      <g id="hp-ctrl-outer-frame" className="hp-ctrl-layer">
        <rect
          x="20"
          y="40"
          width="680"
          height="340"
          rx="56"
          ry="56"
          fill="url(#hp-frame-grad)"
          stroke="rgba(0,0,0,0.12)"
          strokeWidth="1.5"
        />
        {/* Top notch */}
        <rect
          x="320"
          y="32"
          width="80"
          height="14"
          rx="7"
          fill="#0a0a0a"
          opacity="0.82"
        />
        {/* Side rails */}
        <rect x="20" y="160" width="6" height="100" rx="3" fill="rgba(0,0,0,0.18)" />
        <rect x="694" y="160" width="6" height="100" rx="3" fill="rgba(0,0,0,0.18)" />
      </g>

      {/* ── Layer 2: glowing-core (the screen / red pulse) ───────────── */}
      <g id="hp-ctrl-core" className="hp-ctrl-layer">
        <rect
          x="180"
          y="100"
          width="360"
          height="220"
          rx="28"
          fill="url(#hp-screen-grad)"
        />
        <circle cx="360" cy="210" r="120" fill="url(#hp-core-glow)" />
        <circle
          cx="360"
          cy="210"
          r="44"
          fill="#dc2626"
          stroke="#ffffff"
          strokeOpacity="0.18"
          strokeWidth="2"
        />
        {/* Power glyph */}
        <path
          d="M360 188 v 14 M346 210 a 14 14 0 1 0 28 0"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.92"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* ── Layer 3: control-buttons (D-pad + ABXY) ──────────────────── */}
      <g id="hp-ctrl-buttons" className="hp-ctrl-layer">
        {/* Left D-pad */}
        <g transform="translate(96, 210)">
          <rect x="-12" y="-36" width="24" height="72" rx="6" fill="#0a0a0a" />
          <rect x="-36" y="-12" width="72" height="24" rx="6" fill="#0a0a0a" />
        </g>
        {/* Right action buttons */}
        <g transform="translate(624, 210)">
          <circle cx="0" cy="-30" r="13" fill="#dc2626" />
          <circle cx="30" cy="0" r="13" fill="#0a0a0a" />
          <circle cx="-30" cy="0" r="13" fill="#0a0a0a" />
          <circle cx="0" cy="30" r="13" fill="#0a0a0a" />
        </g>
        {/* Center select / start pills */}
        <rect x="320" y="346" width="34" height="8" rx="4" fill="#0a0a0a" opacity="0.55" />
        <rect x="366" y="346" width="34" height="8" rx="4" fill="#0a0a0a" opacity="0.55" />
      </g>

      {/* ── Layer 4: energy-cells (battery bars feeding the core) ────── */}
      <g id="hp-ctrl-cells" className="hp-ctrl-layer">
        {/* Left cells */}
        <rect x="48" y="86" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" />
        <rect x="48" y="102" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" opacity="0.75" />
        <rect x="48" y="118" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" opacity="0.5" />
        {/* Right cells */}
        <rect x="628" y="86" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" />
        <rect x="628" y="102" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" opacity="0.75" />
        <rect x="628" y="118" width="44" height="10" rx="3" fill="url(#hp-cell-grad)" opacity="0.5" />
        {/* Bottom telemetry strip */}
        <rect x="180" y="332" width="360" height="6" rx="3" fill="rgba(220,38,38,0.25)" />
        <rect id="hp-ctrl-telemetry" x="180" y="332" width="120" height="6" rx="3" fill="#dc2626" />
      </g>
    </svg>
  );
});

export default MasterController;
