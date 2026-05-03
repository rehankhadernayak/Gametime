/**
 * Shared Kinetic Mobile Components
 * Reusable animated components: KineticButton, LiquidFillTimer, SwipeCard, etc.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import {
  ANIMATION_CONFIGS,
  HAPTIC_PATTERNS,
  MOBILE_COLORS,
  MOBILE_TYPOGRAPHY,
  useKineticButton,
  useGlowAnimation,
  MIN_TOUCH_TARGET,
} from './kinetic-mobile-theme.js';

const { width } = Dimensions.get('window');

/**
 * KineticButton Component
 * Animated button with tap feedback and haptics
 */
export const KineticButton = ({
  title,
  onPress,
  style,
  variant = 'primary', // 'primary' | 'secondary' | 'danger'
  disabled = false,
  size = 'normal', // 'normal' | 'large' | 'small'
}) => {
  const { animatedStyle, onPress: handlePress, onPressOut } = useKineticButton();

  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${MOBILE_COLORS.neonBlue}, ${MOBILE_COLORS.neonBlueBright})`,
      textColor: MOBILE_COLORS.primary,
    },
    secondary: {
      borderWidth: 2,
      borderColor: MOBILE_COLORS.neonBlue,
      background: 'transparent',
      textColor: MOBILE_COLORS.neonBlue,
    },
    danger: {
      background: `linear-gradient(135deg, ${MOBILE_COLORS.neonRed}, ${MOBILE_COLORS.neonRedBright})`,
      textColor: MOBILE_COLORS.white,
    },
  };

  const sizes = {
    small: { paddingVertical: 8, paddingHorizontal: 12, fontSize: 12 },
    normal: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 14 },
    large: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 16 },
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={() => {
          if (!disabled) {
            handlePress();
            onPress?.();
          }
        }}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.kineticButton,
          {
            ...sizes[size],
            ...variants[variant],
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <Text
          style={{
            ...MOBILE_TYPOGRAPHY.body,
            color: variants[variant].textColor,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * LiquidFillTimer Component
 * SVG animated progress timer with sine-wave liquid effect
 */
export const LiquidFillTimer = ({
  percentage = 50, // 0-100
  size = 120,
  label = 'Earned',
  animating = true,
}) => {
  const liquidLevel = useSharedValue(percentage);

  useAnimatedReaction(
    () => percentage,
    (newPercentage) => {
      liquidLevel.value = withTiming(newPercentage, {
        duration: 800,
        easing: Easing.out(Easing.ease),
      });
    }
  );

  const liquidHeight = (liquidLevel.value / 100) * size;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="liquidGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={MOBILE_COLORS.neonBlue} stopOpacity="1" />
            <Stop offset="100%" stopColor={MOBILE_COLORS.neonBlueBright} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>

        {/* Outer circle border */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 2}
          fill={MOBILE_COLORS.background}
          stroke={MOBILE_COLORS.neonBlue}
          strokeWidth={1}
          opacity={0.3}
        />

        {/* Liquid fill (simplified rect for demo) */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Path
              d={`M 0 ${size - liquidHeight}
                 L ${size} ${size - liquidHeight}
                 L ${size} ${size}
                 L 0 ${size}
                 Z`}
              fill="url(#liquidGradient)"
              opacity={0.8}
            />
          </Svg>
        </Animated.View>

        {/* Center text */}
        <View
          style={{
            position: 'absolute',
            alignItems: 'center',
            justifyContent: 'center',
            width: size,
            height: size,
          }}
        >
          <Text
            style={{
              ...MOBILE_TYPOGRAPHY.h2,
              color: MOBILE_COLORS.neonBlue,
            }}
          >
            {Math.round(percentage)}%
          </Text>
          <Text
            style={{
              ...MOBILE_TYPOGRAPHY.caption,
              color: MOBILE_COLORS.whiteAlpha6,
              marginTop: 4,
            }}
          >
            {label}
          </Text>
        </View>
      </Svg>
    </View>
  );
};

/**
 * SwipeCard Component
 * Horizontal card with swipe-to-approve/reject gestures
 */
export const SwipeCard = ({
  title,
  subtitle,
  image,
  onApprove,
  onReject,
  icon,
  status = 'pending', // 'pending' | 'approved' | 'rejected'
}) => {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const statusColors = {
    pending: MOBILE_COLORS.neonOrange,
    approved: MOBILE_COLORS.neonGreen,
    rejected: MOBILE_COLORS.neonRed,
  };

  return (
    <Animated.View
      style={[
        styles.swipeCard,
        animatedStyle,
        {
          borderLeftColor: statusColors[status],
          borderLeftWidth: 4,
        },
      ]}
    >
      {icon && (
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 12,
            background: MOBILE_COLORS.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          {icon}
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...MOBILE_TYPOGRAPHY.bodySmall,
            color: MOBILE_COLORS.white,
            fontWeight: '600',
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              ...MOBILE_TYPOGRAPHY.caption,
              color: MOBILE_COLORS.whiteAlpha6,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Status indicator dot */}
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: statusColors[status],
          marginLeft: 8,
        }}
      />
    </Animated.View>
  );
};

/**
 * EnergyOrb Component
 * Main dashboard energy sphere with platform icon
 */
export const EnergyOrb = ({
  platformIcon,
  percentage = 60,
  onTap,
  size = 180,
  color = MOBILE_COLORS.neonBlue,
}) => {
  const { animatedStyle: glowStyle } = useGlowAnimation(color, 0.4);
  const { pressed, animatedStyle: pressStyle } = useKineticButton();

  return (
    <Animated.View style={[glowStyle, pressStyle]}>
      <TouchableOpacity
        onPress={() => {
          HAPTIC_PATTERNS.success();
          onTap?.();
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          background: MOBILE_COLORS.surface,
          borderWidth: 2,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          marginVertical: 20,
        }}
      >
        {/* Percentage ring would go here */}
        <Text
          style={{
            ...MOBILE_TYPOGRAPHY.display,
            color,
          }}
        >
          {percentage}%
        </Text>
        {platformIcon && (
          <View style={{ marginTop: 12, fontSize: 32 }}>
            {platformIcon}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * ProgressOrb Component (Mini Version)
 * Small progress indicator for lists
 */
export const ProgressOrb = ({
  name,
  percentage = 50,
  color = MOBILE_COLORS.neonBlue,
  onPress,
  size = 60,
}) => {
  return (
    <TouchableOpacity
      onPress={() => {
        HAPTIC_PATTERNS.lightTap();
        onPress?.();
      }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: MOBILE_COLORS.surface,
        borderWidth: 2,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 6,
      }}
    >
      <Text
        style={{
          ...MOBILE_TYPOGRAPHY.caption,
          color,
          fontWeight: '700',
        }}
      >
        {percentage}%
      </Text>
      <Text
        style={{
          ...MOBILE_TYPOGRAPHY.caption,
          color: MOBILE_COLORS.whiteAlpha3,
          fontSize: 9,
          marginTop: 2,
        }}
      >
        {name.split(' ')[0]}
      </Text>
    </TouchableOpacity>
  );
};

/**
 * TerminalLine Component
 * Single line in terminal output
 */
export const TerminalLine = ({ text, type = 'system' }) => {
  const typeColors = {
    system: MOBILE_COLORS.neonGreen,
    user: MOBILE_COLORS.neonBlue,
    error: MOBILE_COLORS.neonRed,
  };

  const prefix = type === 'system' ? '$ ' : type === 'user' ? '> ' : '⚠ ';

  return (
    <Text
      style={{
        ...MOBILE_TYPOGRAPHY.terminal,
        color: typeColors[type],
      }}
    >
      {prefix}
      {text}
    </Text>
  );
};

/**
 * LaserScanline Component
 * Animated horizontal laser effect for camera scanning
 */
export const LaserScanline = ({
  animating = true,
  height = 2,
  width = '100%',
}) => {
  const offset = useSharedValue(0);

  React.useEffect(() => {
    if (animating) {
      const animateAgain = () => {
        offset.value = withTiming(1, {
          duration: 2000,
          easing: Easing.linear,
        });

        setTimeout(() => {
          offset.value = 0;
        }, 2000);
      };

      animateAgain();
      const interval = setInterval(animateAgain, 2000);
      return () => clearInterval(interval);
    }
  }, [animating]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: offset.value * 200, // Adjust based on parent height
      },
    ],
    opacity: animating ? 1 : 0,
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          backgroundColor: MOBILE_COLORS.neonRed,
          shadowColor: MOBILE_COLORS.neonRed,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 10,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  kineticButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    shadowColor: MOBILE_COLORS.neonBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  swipeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    marginHorizontal: 12,
    borderRadius: 12,
    backgroundColor: MOBILE_COLORS.surface,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.whiteAlpha3,
  },
});

export default {
  KineticButton,
  LiquidFillTimer,
  SwipeCard,
  EnergyOrb,
  ProgressOrb,
  TerminalLine,
  LaserScanline,
};
