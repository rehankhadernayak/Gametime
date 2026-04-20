/**
 * Master Controller Component
 * 3D-rendered controller that assembles itself as user scrolls
 * Represents "The Key to Gaming Time"
 * Inspired by String Tune's katana assembly sequence
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/kinetic-master-controller.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * MasterController Component
 * Displays animated SVG controller that builds itself on scroll
 *
 * @param {Object} props - Component props
 * @param {boolean} props.autoScroll - Whether to enable scroll animation (default: true)
 * @param {number} props.speed - Animation speed multiplier (default: 1)
 */
export function MasterController({ autoScroll = true, speed = 1 }) {
  const containerRef = useRef(null);
  const partsRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || !autoScroll) return;

    const parts = [
      { id: 'core', delay: 0, element: null },
      { id: 'button-a', delay: 0.2, element: null },
      { id: 'button-b', delay: 0.3, element: null },
      { id: 'trigger', delay: 0.4, element: null },
      { id: 'antenna', delay: 0.5, element: null },
      { id: 'glow', delay: 0.6, element: null },
    ];

    // Collect part elements
    const svgElements = containerRef.current.querySelectorAll('[data-part]');
    svgElements.forEach((el) => {
      const partId = el.getAttribute('data-part');
      const part = parts.find((p) => p.id === partId);
      if (part) part.element = el;
    });

    // Set initial state
    parts.forEach((part) => {
      if (part.element) {
        gsap.set(part.element, {
          opacity: 0,
          scale: 0,
          transformOrigin: 'center',
        });
      }
    });

    // Create scroll trigger animation
    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        parts.forEach((part, idx) => {
          if (!part.element) return;

          const adjustedProgress = Math.max(
            0,
            (self.progress - part.delay / 0.6) * (1 / (1 - part.delay / 0.6))
          );
          const eased = gsap.utils.clamp(0, 1, adjustedProgress);

          gsap.to(part.element, {
            opacity: eased,
            scale: eased,
            rotation: eased * 360,
            duration: 0,
            overwrite: 'auto',
          });
        });
      },
      markers: false,
    });

    return () => {
      trigger.kill();
    };
  }, [autoScroll, speed]);

  return (
    <div ref={containerRef} className="hero-master-controller">
      <svg
        viewBox="0 0 400 600"
        className="controller-svg"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Master Controller - The Key to Gaming Time"
      >
        {/* Core Circle - Central processor */}
        <g data-part="core" className="controller-part">
          <circle
            cx="200"
            cy="300"
            r="80"
            fill="none"
            stroke="url(#gradient-blue)"
            strokeWidth="2"
            opacity="0.8"
          />
          <circle cx="200" cy="300" r="70" fill="none" stroke="#00D9FF" strokeWidth="1" opacity="0.4" />
        </g>

        {/* Button A - Red (Left) */}
        <g data-part="button-a" className="controller-part">
          <circle cx="150" cy="250" r="20" fill="#FF2E5A" opacity="0.9" />
          <circle cx="150" cy="250" r="25" fill="none" stroke="#FF2E5A" strokeWidth="1" opacity="0.5" />
          <text
            x="150"
            y="258"
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#FFFFFF"
          >
            A
          </text>
        </g>

        {/* Button B - Blue (Right) */}
        <g data-part="button-b" className="controller-part">
          <circle cx="250" cy="250" r="20" fill="#00D9FF" opacity="0.9" />
          <circle cx="250" cy="250" r="25" fill="none" stroke="#00D9FF" strokeWidth="1" opacity="0.5" />
          <text
            x="250"
            y="258"
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
            fill="#000000"
          >
            B
          </text>
        </g>

        {/* Trigger */}
        <g data-part="trigger" className="controller-part">
          <rect x="180" y="380" width="40" height="60" fill="none" stroke="#FF2E5A" strokeWidth="2" />
          <text x="200" y="415" textAnchor="middle" fontSize="12" fill="#FF2E5A" fontWeight="600">
            PLAY
          </text>
        </g>

        {/* Antenna */}
        <g data-part="antenna" className="controller-part">
          <line x1="200" y1="220" x2="200" y2="100" stroke="#00D9FF" strokeWidth="2" strokeDasharray="4 4" />
          <circle cx="200" cy="100" r="4" fill="#00D9FF" />
        </g>

        {/* Glow/Aura */}
        <g data-part="glow" className="controller-part">
          <circle
            cx="200"
            cy="300"
            r="100"
            fill="none"
            stroke="url(#gradient-blue-glow)"
            strokeWidth="4"
            opacity="0.3"
            filter="url(#blur-large)"
          />
        </g>

        {/* SVG Filters & Gradients */}
        <defs>
          <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" stopOpacity="1" />
            <stop offset="100%" stopColor="#00A8CC" stopOpacity="0.6" />
          </linearGradient>

          <linearGradient id="gradient-blue-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#00D9FF" stopOpacity="0" />
          </linearGradient>

          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="blur-large">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
      </svg>

      {/* Labels */}
      <div className="controller-labels">
        <h1 className="controller-label">MASTER CONTROLLER</h1>
        <p className="controller-desc">Your key to gaming time</p>
      </div>
    </div>
  );
}

export default MasterController;
