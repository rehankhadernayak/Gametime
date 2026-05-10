/**
 * Kinetic Mobile Theme
 * Reanimated 2 animation utilities and shared values for mobile
 * Haptic patterns, gesture handlers, and animation configs
 */

import React from 'react';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/**
 * Animation Configs
 */
export const ANIMATION_CONFIGS = {
  // Spring configs for bouncy, natural motion
  spring: {
    damping: 10,
    mass: 1,
    stiffness: 100,
    overshootClamping: false,
    restSpeedThreshold: 2,
    restDisplacementThreshold: 2,
  },

  // Fast spring for quick feedback
  springFast: {
    damping: 15,
    mass: 0.8,
    stiffness: 150,
    overshootClamping: true,
    restSpeedThreshold: 2,
    restDisplacementThreshold: 2,
  },

  // Ease configs for smooth transitions
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  cubic: Easing.cubic(0.25),

  // Timing durations
  durations: {
    fast: 250,
    normal: 400,
    slow: 600,
    veryFast: 150,
  },
};

/**
 * Haptic Feedback Patterns
 */
export const HAPTIC_PATTERNS = {
  // Light tap feedback
  lightTap: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
    } catch (e) {
      // If haptics not available, fail silently
    }
  },

  // Medium impact (button press)
  buttonPress: () => {
    try {
      Haptics.selectionAsync();
    } catch (e) {
      // Graceful fallback
    }
  },

  // Strong impact (success/approval)
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Graceful fallback
    }
  },

  // Warning/error
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      // Graceful fallback
    }
  },

  // Double tap pattern
  doubleTap: () => {
    try {
      Haptics.selectionAsync();
      setTimeout(() => Haptics.selectionAsync(), 100);
    } catch (e) {
      // Graceful fallback
    }
  },

  // Pulse pattern for attention
  pulse: () => {
    try {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => Haptics.selectionAsync(), i * 150);
      }
    } catch (e) {
      // Graceful fallback
    }
  },
};

/**
 * useKineticButton Hook
 * Animated button with tap feedback
 * @returns { pressed: Animated.Value, animatedStyle, onPress, onPressOut }
 */
export const useKineticButton = () => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pressed.value ? 0.95 : 1 },
      { translateY: pressed.value ? 2 : 0 },
    ],
    opacity: pressed.value ? 0.8 : 1,
  }));

  const onPress = () => {
    pressed.value = withTiming(1, {
      duration: ANIMATION_CONFIGS.durations.veryFast,
      easing: ANIMATION_CONFIGS.easeIn,
    });
    HAPTIC_PATTERNS.buttonPress();
  };

  const onPressOut = () => {
    pressed.value = withSpring(0, ANIMATION_CONFIGS.springFast);
  };

  return { pressed, animatedStyle, onPress, onPressOut };
};

/**
 * useFloatingAnimation Hook
 * Gentle up/down floating motion
 * @param {number} distance - Distance to float (default: 10)
 * @param {number} duration - Duration of cycle (default: 3000)
 * @returns { animatedStyle }
 */
export const useFloatingAnimation = (distance = 10, duration = 3000) => {
  const translateY = useSharedValue(0);

  React.useEffect(() => {
    const animate = () => {
      translateY.value = withTiming(distance, {
        duration: duration / 2,
        easing: Easing.sin,
      });

      setTimeout(() => {
        translateY.value = withTiming(-distance, {
          duration: duration / 2,
          easing: Easing.sin,
        });
      }, duration / 2);

      setTimeout(animate, duration);
    };

    animate();

    return () => {
      translateY.value = 0;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { animatedStyle };
};

/**
 * usePulseAnimation Hook
 * Pulsing scale animation for emphasis
 * @param {number} minScale - Minimum scale (default: 1)
 * @param {number} maxScale - Maximum scale (default: 1.1)
 * @param {number} duration - Pulse duration (default: 2000)
 * @returns { animatedStyle }
 */
export const usePulseAnimation = (minScale = 1, maxScale = 1.1, duration = 2000) => {
  const scale = useSharedValue(minScale);

  React.useEffect(() => {
    const animate = () => {
      scale.value = withTiming(maxScale, {
        duration: duration / 2,
        easing: Easing.inOut(Easing.ease),
      });

      setTimeout(() => {
        scale.value = withTiming(minScale, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
        });
      }, duration / 2);

      setTimeout(animate, duration);
    };

    animate();

    return () => {
      scale.value = minScale;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
};

/**
 * useSwipeGesture Hook
 * Detects swipe left/right for card navigation
 * @param {Function} onSwipeLeft - Callback when swiped left
 * @param {Function} onSwipeRight - Callback when swiped right
 * @param {number} threshold - Swipe distance threshold (default: 50)
 * @returns { gestureHandler, animatedStyle, translateX }
 */
export const useSwipeGesture = (
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  threshold = 50
) => {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const gestureHandler = {
    onBegan: (evt) => {
      startX.value = evt.translationX;
      HAPTIC_PATTERNS.lightTap();
    },
    onUpdate: (evt) => {
      translateX.value = evt.translationX - startX.value;
    },
    onEnded: (evt) => {
      const swipeDistance = evt.translationX - startX.value;

      if (swipeDistance > threshold) {
        // Swiped right
        onSwipeRight();
        HAPTIC_PATTERNS.success();
      } else if (swipeDistance < -threshold) {
        // Swiped left
        onSwipeLeft();
        HAPTIC_PATTERNS.error();
      }

      // Reset position
      translateX.value = withSpring(0, ANIMATION_CONFIGS.spring);
    },
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { gestureHandler, animatedStyle, translateX };
};

/**
 * useGlowAnimation Hook
 * Animated glow effect for emphasis
 * @param {string} color - Base glow color
 * @param {number} intensity - Glow intensity (0-1)
 * @returns { animatedStyle }
 */
export const useGlowAnimation = (color = '#00D9FF', intensity = 0.5) => {
  const glowOpacity = useSharedValue(intensity);

  React.useEffect(() => {
    const animate = () => {
      glowOpacity.value = withTiming(intensity * 1.5, {
        duration: 1500,
        easing: Easing.sin,
      });

      setTimeout(() => {
        glowOpacity.value = withTiming(intensity, {
          duration: 1500,
          easing: Easing.sin,
        });
      }, 1500);

      setTimeout(animate, 3000);
    };

    animate();

    return () => {
      glowOpacity.value = intensity;
    };
  }, [intensity]);

  const animatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  }));

  return { animatedStyle };
};

/**
 * Color Palette (Mobile-optimized)
 */
export const MOBILE_COLORS = {
  primary: '#000000',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F5',
  neonRed: '#000000',
  neonRedBright: '#404040',
  neonBlue: '#000000',
  neonBlueBright: '#525252',
  neonGreen: '#15803d',
  neonOrange: '#a16207',
  white: '#FFFFFF',
  whiteAlpha6: 'rgba(0, 0, 0, 0.55)',
  whiteAlpha3: 'rgba(0, 0, 0, 0.25)',
  redGlow: 'rgba(0, 0, 0, 0.12)',
  blueGlow: 'rgba(0, 0, 0, 0.12)',
};

/**
 * Typography (Mobile-optimized)
 */
export const MOBILE_TYPOGRAPHY = {
  display: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 28,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  terminal: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Courier New',
    lineHeight: 18,
  },
};

/**
 * Safe Area Margins (for notch/safe area)
 */
export const SAFE_AREA = {
  horizontal: 16,
  vertical: 12,
  top: 20,
  bottom: 24,
};

/**
 * Touch Targets (Minimum 48×48 for accessibility)
 */
export const MIN_TOUCH_TARGET = 48;

export default {
  ANIMATION_CONFIGS,
  HAPTIC_PATTERNS,
  MOBILE_COLORS,
  MOBILE_TYPOGRAPHY,
  SAFE_AREA,
  MIN_TOUCH_TARGET,
  useKineticButton,
  useFloatingAnimation,
  usePulseAnimation,
  useSwipeGesture,
  useGlowAnimation,
};
