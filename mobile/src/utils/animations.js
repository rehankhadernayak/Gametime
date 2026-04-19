import { Animated, Easing } from 'react-native';

/**
 * Animation utilities for premium motion design
 */

export const AnimationPresets = {
  // Entrance animations
  slideInUp: (duration = 400, delay = 0) => ({
    enter: {
      useNativeDriver: true,
      initial: { opacity: 0, translateY: 50 },
      animate: { opacity: 1, translateY: 0 },
      transition: {
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
      },
    },
  }),

  slideInLeft: (duration = 400, delay = 0) => ({
    enter: {
      useNativeDriver: true,
      initial: { opacity: 0, translateX: -50 },
      animate: { opacity: 1, translateX: 0 },
      transition: {
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
      },
    },
  }),

  fadeIn: (duration = 300, delay = 0) => ({
    enter: {
      useNativeDriver: true,
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration, delay },
    },
  }),

  scaleIn: (duration = 400, delay = 0) => ({
    enter: {
      useNativeDriver: true,
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: {
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
      },
    },
  }),

  // Looping animations
  pulse: () => ({
    loop: {
      loop: true,
      initial: { opacity: 0.7 },
      animate: { opacity: 1 },
      transition: {
        type: 'timing',
        duration: 1500,
        loop: true,
      },
    },
  }),

  float: () => ({
    loop: {
      loop: true,
      initial: { translateY: 0 },
      animate: { translateY: -8 },
      transition: {
        type: 'timing',
        duration: 2000,
        loop: true,
      },
    },
  }),

  gentle: () => ({
    loop: {
      loop: true,
      initial: { scale: 1 },
      animate: { scale: 1.02 },
      transition: {
        type: 'timing',
        duration: 2000,
        loop: true,
      },
    },
  }),

  rotate: () => ({
    loop: {
      loop: true,
      initial: { rotate: '0deg' },
      animate: { rotate: '360deg' },
      transition: {
        type: 'timing',
        duration: 3000,
        loop: true,
      },
    },
  }),
};

/**
 * Create smooth number counter animation
 */
export function createCounterAnimation(fromValue, toValue, duration = 600) {
  const anim = new Animated.Value(fromValue);

  const animation = Animated.timing(anim, {
    toValue,
    duration,
    useNativeDriver: false,
    easing: Easing.out(Easing.cubic),
  });

  return { animation, animatedValue: anim };
}

/**
 * Create spring bounce animation
 */
export function createBounceAnimation() {
  const position = new Animated.Value(0);

  Animated.sequence([
    Animated.spring(position, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 20,
    }),
  ]).start();

  return position;
}

/**
 * Stagger animations for lists
 */
export function staggerAnimation(length, duration = 300, initialDelay = 0) {
  return Array.from({ length }).map((_, idx) => ({
    delay: initialDelay + idx * (duration / length),
  }));
}

/**
 * Tab transition interpolation
 */
export function createTabTransition(scrollX, tabWidth, tabIndex) {
  return scrollX.interpolate({
    inputRange: [(tabIndex - 1) * tabWidth, tabIndex * tabWidth, (tabIndex + 1) * tabWidth],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
}

/**
 * Simple gesture response
 */
export function createPressAnimation() {
  const scale = new Animated.Value(1);
  const opacity = new Animated.Value(1);

  const onPressIn = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, opacity, onPressIn, onPressOut };
}
