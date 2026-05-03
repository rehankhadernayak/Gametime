/**
 * MasterControllerHiFi
 * High-fidelity 4-layer SVG with OuterFrame, GlowingCore, ControlButtons, EnergyCells.
 * Each layer has data-gsap-group for GSAP animation.
 * No animations here—purely structure. GSAP calls via MasterControllerHiFiAnimation.js
 */

export const MasterControllerHiFi = () => {
  return (
    <svg
      width="500"
      height="360"
      viewBox="0 0 500 360"
      xmlns="http://www.w3.org/2000/svg"
      className="master-controller-hifi"
      style={{ background: 'transparent', overflow: 'visible' }}
    >
      {/* ── Glow Filter for glowing elements ─────────────────────── */}
      <defs>
        <filter id="glow-light">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="core-glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="core-gradient" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#3DD9FF" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0F1423" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║ LAYER 1: OUTER FRAME (Heavy mechanical border)            ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      <g data-gsap-group="outer-frame" className="gsap-group">
        {/* Main frame rectangle */}
        <rect
          x="60"
          y="40"
          width="380"
          height="280"
          fill="none"
          stroke="#0FF"
          strokeWidth="3"
          rx="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Corner accents (L-shaped brackets in corners) */}
        <g strokeWidth="2" stroke="#0FF" fill="none">
          {/* Top-Left corner bracket */}
          <path d="M 70 55 L 85 55 M 70 55 L 70 70" />
          {/* Top-Right corner bracket */}
          <path d="M 430 55 L 415 55 M 430 55 L 430 70" />
          {/* Bottom-Left corner bracket */}
          <path d="M 70 305 L 85 305 M 70 305 L 70 290" />
          {/* Bottom-Right corner bracket */}
          <path d="M 430 305 L 415 305 M 430 305 L 430 290" />
        </g>
      </g>

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║ LAYER 2: GLOWING CORE (Central display + glow effect)    ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      <g data-gsap-group="glowing-core" className="gsap-group">
        {/* Main core panel with gradient fill */}
        <rect
          x="90"
          y="70"
          width="320"
          height="220"
          fill="#0A0E1A"
          rx="6"
        />
        {/* Gradient underlay (gives depth) */}
        <rect
          x="90"
          y="70"
          width="320"
          height="220"
          fill="url(#core-gradient)"
          rx="6"
        />
        {/* Glow border (subtle blue edge) */}
        <rect
          x="90"
          y="70"
          width="320"
          height="220"
          fill="none"
          stroke="#0FF"
          strokeWidth="1.5"
          rx="6"
          opacity="0.4"
          filter="url(#core-glow)"
        />
        {/* Horizontal line across core (aesthetic divider) */}
        <line
          x1="100"
          y1="165"
          x2="400"
          y2="165"
          stroke="#0FF"
          strokeWidth="1"
          opacity="0.2"
        />
      </g>

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║ LAYER 3: CONTROL BUTTONS (6 interactive circles)          ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      <g data-gsap-group="control-buttons" className="gsap-group">
        {/* Button Row 1 (Top 3 buttons) */}
        <circle cx="150" cy="110" r="14" fill="#0FF" opacity="0.9" />
        <circle cx="250" cy="110" r="14" fill="#0FF" opacity="0.9" />
        <circle cx="350" cy="110" r="14" fill="#0FF" opacity="0.9" />
        
        {/* Button Row 2 (Bottom 3 buttons) */}
        <circle cx="150" cy="220" r="14" fill="#0FF" opacity="0.9" />
        <circle cx="250" cy="220" r="14" fill="#0FF" opacity="0.9" />
        <circle cx="350" cy="220" r="14" fill="#0FF" opacity="0.9" />
        
        {/* Inner core circles for depth */}
        {[150, 250, 350].map((cx, i) => (
          <g key={`btn-${i}`}>
            <circle cx={cx} cy="110" r="8" fill="none" stroke="#0FF" strokeWidth="1" opacity="0.6" />
            <circle cx={cx} cy="220" r="8" fill="none" stroke="#0FF" strokeWidth="1" opacity="0.6" />
          </g>
        ))}
      </g>

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║ LAYER 4: ENERGY CELLS (Left + Right floating accents)     ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      <g data-gsap-group="energy-cells" className="gsap-group">
        {/* Left energy cell group */}
        <g>
          {/* Left main cell */}
          <polygon
            points="30,120 50,100 50,140"
            fill="#0FF"
            opacity="0.25"
          />
          {/* Left accent dots */}
          <circle cx="25" cy="115" r="3" fill="#0FF" opacity="0.4" />
          <circle cx="20" cy="125" r="2" fill="#0FF" opacity="0.3" />
        </g>

        {/* Right energy cell group */}
        <g>
          {/* Right main cell */}
          <polygon
            points="470,120 450,100 450,140"
            fill="#0FF"
            opacity="0.25"
          />
          {/* Right accent dots */}
          <circle cx="475" cy="115" r="3" fill="#0FF" opacity="0.4" />
          <circle cx="480" cy="125" r="2" fill="#0FF" opacity="0.3" />
        </g>

        {/* Center energy pulse (small circle at bottom-center) */}
        <circle cx="250" cy="315" r="5" fill="#0FF" opacity="0.3" />
      </g>

      {/* ╔════════════════════════════════════════════════════════════╗ */}
      {/* ║ OPTIONAL: Scan line effect (animated separately via CSS)  ║ */}
      {/* ╚════════════════════════════════════════════════════════════╝ */}
      <line
        x1="100"
        y1="100"
        x2="400"
        y2="100"
        stroke="#0FF"
        strokeWidth="0.5"
        opacity="0.1"
        className="scanline"
      />
    </svg>
  );
};

export default MasterControllerHiFi;
