/**
 * Child Progress Orbs Component
 * Floating animated progress spheres for each child
 * Shows completion %, tier status (green/yellow/red), RP/GP
 */

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '../styles/child-progress-orbs.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * ProgressOrb - Single child progress sphere
 * @param {Object} child - { id, name, RP, GP, completionPercent, tier }
 * @param {Function} onSelect - Callback when clicked
 * @param {number} index - Index for stagger animation
 */
function ProgressOrb({ child, onSelect, index }) {
  const orbRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Determine tier color
  const getTierColor = () => {
    if (child.completionPercent >= 80) return '#15803d';
    if (child.completionPercent >= 40) return '#a16207';
    return '#b91c1c';
  };

  // Calculate ring offset for percentage
  const circumference = 2 * Math.PI * 45; // radius 45
  const ringOffset = circumference - (child.completionPercent / 100) * circumference;

  // Float animation on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!orbRef.current) return;
      const scrollY = window.scrollY;
      gsap.to(orbRef.current, {
        y: scrollY * 0.2,
        duration: 0,
        overwrite: false,
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hover expand animation
  useEffect(() => {
    if (!orbRef.current) return;
    gsap.to(orbRef.current, {
      scale: isHovered ? 1.15 : 1,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, [isHovered]);

  // Staggered entrance animation on mount
  useEffect(() => {
    if (!orbRef.current) return;
    gsap.from(orbRef.current, {
      opacity: 0,
      scale: 0.5,
      duration: 0.6,
      delay: index * 0.1,
      ease: 'back.out',
    });
  }, [index]);

  // Pulse animation
  useEffect(() => {
    if (!ringRef.current) return;
    gsap.to(ringRef.current, {
      strokeOpacity: 0.8,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }, []);

  return (
    <div
      ref={orbRef}
      className="progress-orb"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(child.id)}
      role="button"
      tabIndex={0}
      aria-label={`${child.name}: ${child.completionPercent}% complete`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(child.id);
      }}
    >
      {/* SVG CIRCLE WITH PROGRESS RING */}
      <svg
        className="orb-svg"
        viewBox="0 0 100 100"
        width="120"
        height="120"
      >
        {/* Outer glow circle */}
        <defs>
          <filter id={`glow-${child.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="rgba(0, 0, 0, 0.4)"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />

        {/* Progress ring (stroked circle) */}
        <circle
          ref={ringRef}
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getTierColor()}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={ringOffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          filter={`url(#glow-${child.id})`}
          opacity="0.8"
        />
      </svg>

      {/* CONTENT OVERLAY */}
      <div className="orb-content">
        <div className="orb-percent">{child.completionPercent}%</div>
        <div
          ref={labelRef}
          className="orb-name"
          style={{ fontSize: isHovered ? '14px' : '12px' }}
        >
          {child.name}
        </div>
      </div>

      {/* HOVER POPUP */}
      {isHovered && (
        <div className="orb-popup">
          <div className="popup-row">
            <span>RP:</span>
            <span className="popup-value">{child.RP}</span>
          </div>
          <div className="popup-row">
            <span>GP:</span>
            <span className="popup-value">{child.GP}</span>
          </div>
          <div className="popup-row">
            <span>Tier:</span>
            <span className="popup-value" style={{ color: getTierColor() }}>
              {child.completionPercent >= 80 ? '🟢' : child.completionPercent >= 40 ? '🟡' : '🔴'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ChildProgressOrbs Container
 * Manages collection of child progress orbs
 *
 * @param {Array} children - Child data: [{ id, name, RP, GP, completionPercent, tier }]
 * @param {Function} onSelectChild - Callback when child orb clicked
 * @param {number} containerHeight - Height of container (default 400)
 */
export function ChildProgressOrbs({
  children = [],
  onSelectChild = () => {},
  containerHeight = 400,
}) {
  const containerRef = useRef(null);

  return (
    <div
      ref={containerRef}
      className="child-progress-orbs"
      style={{ minHeight: containerHeight }}
      role="region"
      aria-label="Child progress indicators"
    >
      <div className="orbs-grid">
        {children.map((child, index) => (
          <ProgressOrb
            key={child.id}
            child={child}
            onSelect={onSelectChild}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default ChildProgressOrbs;
