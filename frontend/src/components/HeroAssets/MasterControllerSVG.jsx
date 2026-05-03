/**
 * MasterControllerSVG
 * Static SVG export with 5 named groups for GSAP animation.
 * No transforms, no animations—purely structure.
 */

export const MasterControllerSVG = () => {
  return (
    <svg
      width="400"
      height="300"
      viewBox="0 0 400 300"
      xmlns="http://www.w3.org/2000/svg"
      className="master-controller-svg"
      style={{ background: 'transparent' }}
    >
      {/* Outer Frame */}
      <g data-gsap-group="outer-frame">
        <rect
          x="50"
          y="30"
          width="300"
          height="240"
          fill="none"
          stroke="#0FF"
          strokeWidth="2"
        />
      </g>

      {/* Screen Core */}
      <g data-gsap-group="screen-core">
        <rect
          x="60"
          y="50"
          width="280"
          height="180"
          fill="#1a1a2e"
          rx="4"
        />
        {/* Subtle glow filter reference */}
        <filter id="screen-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <rect
          x="60"
          y="50"
          width="280"
          height="180"
          fill="none"
          stroke="#0FF"
          strokeWidth="1"
          rx="4"
          opacity="0.3"
          filter="url(#screen-glow)"
        />
      </g>

      {/* Buttons (6 circular, 2 rows of 3) */}
      <g data-gsap-group="buttons">
        {/* Row 1 */}
        <circle cx="120" cy="250" r="12" fill="#0FF" />
        <circle cx="200" cy="250" r="12" fill="#0FF" />
        <circle cx="280" cy="250" r="12" fill="#0FF" />
        {/* Row 2 */}
        <circle cx="120" cy="275" r="12" fill="#0FF" />
        <circle cx="200" cy="275" r="12" fill="#0FF" />
        <circle cx="280" cy="275" r="12" fill="#0FF" />
      </g>

      {/* Left Wing */}
      <g data-gsap-group="left-wing" opacity="0.2">
        <polygon
          points="40,100 40,200 20,150"
          fill="#0FF"
        />
      </g>

      {/* Right Wing */}
      <g data-gsap-group="right-wing" opacity="0.2">
        <polygon
          points="360,100 360,200 380,150"
          fill="#0FF"
        />
      </g>
    </svg>
  );
};

export default MasterControllerSVG;
