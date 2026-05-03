/**
 * HeroGlassmorphicCard
 * High-fidelity glassmorphic dashboard UI card.
 * Replaces SVG approach with CSS/HTML.
 * 
 * Features:
 * - Dark glass container (backdrop-filter blur, light border)
 * - 3 Quest Pills with neon gradients
 * - Daily Goal progress bar
 * - All elements animated via GSAP from parent
 */

import React from 'react';

export const HeroGlassmorphicCard = React.forwardRef((props, ref) => {
  return (
    <div ref={ref} className="hero-glass-card" data-gsap-main="card">
      {/* Glassmorphic background */}
      <div className="glass-bg" />

      {/* Content wrapper */}
      <div className="glass-content">
        {/* Header */}
        <div className="glass-header" data-gsap-group="header">
          <h3 className="glass-title">Today's Quests</h3>
          <p className="glass-subtitle">Keep earning, keep climbing</p>
        </div>

        {/* Quest Pills Container */}
        <div className="glass-quests" data-gsap-group="quests">
          {/* Quest Pill 1 */}
          <div className="quest-pill quest-pill--cyan" data-quest-index="0">
            <div className="quest-icon">✓</div>
            <div className="quest-info">
              <div className="quest-title">Clean Your Room</div>
              <div className="quest-reward">+150 RP</div>
            </div>
          </div>

          {/* Quest Pill 2 */}
          <div className="quest-pill quest-pill--purple" data-quest-index="1">
            <div className="quest-icon">✓</div>
            <div className="quest-info">
              <div className="quest-title">Finish Homework</div>
              <div className="quest-reward">+200 RP</div>
            </div>
          </div>

          {/* Quest Pill 3 */}
          <div className="quest-pill quest-pill--blue" data-quest-index="2">
            <div className="quest-icon">✓</div>
            <div className="quest-info">
              <div className="quest-title">Read for 30 mins</div>
              <div className="quest-reward">+100 RP</div>
            </div>
          </div>
        </div>

        {/* Daily Goal Progress */}
        <div className="glass-progress" data-gsap-group="progress">
          <div className="progress-label">
            <span className="progress-text">Daily Goal</span>
            <span className="progress-percent">75%</span>
          </div>
          <div className="progress-bar-wrapper">
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: '75%' }}
                data-gsap-group="progress-fill"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HeroGlassmorphicCard;
