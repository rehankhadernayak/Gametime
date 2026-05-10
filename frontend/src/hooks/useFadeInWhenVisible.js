import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver-driven reveal for brutalist scroll sections.
 */
export function useFadeInWhenVisible(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return [ref, visible];
}
