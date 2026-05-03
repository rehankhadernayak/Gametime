/**
 * MasterControllerWithAnimation
 * Wrapper component that combines SVG + animation.
 * Mounts animation automatically.
 */

import { useEffect, useRef } from 'react';
import MasterControllerSVG from './MasterControllerSVG';
import { animateMasterController } from './MasterControllerAnimation';

/**
 * Renders SVG with GSAP animation triggered on mount.
 */
export const MasterControllerWithAnimation = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      animateMasterController(containerRef.current);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="master-controller-wrapper"
      style={{ display: 'inline-block' }}
    >
      <MasterControllerSVG />
    </div>
  );
};

export default MasterControllerWithAnimation;
