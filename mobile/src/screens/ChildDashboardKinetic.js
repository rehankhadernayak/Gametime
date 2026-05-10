/**
 * Child Dashboard Kinetic Component
 * Main dashboard for children showing energy orb, tasks, and gaming sessions
 * Features: floating energy sphere, liquid fill timer, horizontal task carousel
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  MOBILE_COLORS,
  MOBILE_TYPOGRAPHY,
  SAFE_AREA,
  HAPTIC_PATTERNS,
  usePulseAnimation,
  useFloatingAnimation,
} from '../theme/kinetic-mobile-theme.js';
import {
  EnergyOrb,
  LiquidFillTimer,
  SwipeCard,
  KineticButton,
  ProgressOrb,
} from './shared-mobile-components.js';

const { width, height } = Dimensions.get('window');

/**
 * ChildDashboardKinetic
 * @param {Object} childData - { id, name, RP, GP, completionPercent, platformPreference }
 * @param {Array} tasks - Tasks for child
 * @param {Function} onTaskPress - Callback when task tapped
 * @param {Function} onStartSession - Callback to start gaming session
 * @param {Function} onSwitchPlatform - Callback to switch gaming platform
 */
export function ChildDashboardKinetic({
  childData = { id: '', name: 'Child', RP: 0, GP: 0, completionPercent: 50, platformPreference: 'roblox' },
  tasks = [],
  onTaskPress = () => {},
  onStartSession = () => {},
  onSwitchPlatform = () => {},
  navigation,
}) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isGaming, setIsGaming] = useState(false);
  const [energyDrain, setEnergyDrain] = useState(0);

  // Floating animation for energy orb
  const { animatedStyle: floatingStyle } = useFloatingAnimation(15, 3500);

  // Pulse animation for energy orb
  const { animatedStyle: pulseStyle } = usePulseAnimation(1, 1.08, 2000);

  // Energy drain timer (simulates screen time consumption)
  useEffect(() => {
    if (!isGaming) return;

    const interval = setInterval(() => {
      setEnergyDrain((prev) => Math.min(prev + 1, 100));
    }, 2000); // Drain 1% every 2 seconds

    return () => clearInterval(interval);
  }, [isGaming]);

  const handleTaskSwipe = (task, direction) => {
    if (direction === 'right') {
      // Approve/Submit
      HAPTIC_PATTERNS.success();
      navigation?.navigate('TaskSubmission', { taskId: task.id });
    } else if (direction === 'left') {
      // Skip/Dismiss
      HAPTIC_PATTERNS.lightTap();
      setSelectedTask(null);
    }
  };

  const platformEmojis = {
    roblox: '🎮',
    steam: '🎮',
    razer: '🎯',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── HEADER ─────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {childData.name}! 👋</Text>
            <Text style={styles.subheading}>Time to earn some points?</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              HAPTIC_PATTERNS.lightTap();
              navigation?.navigate('Profile');
            }}
            style={styles.profileButton}
          >
            <Text style={styles.profileEmoji}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* ── ENERGY ORB (CENTERPIECE) ────────────────────────── */}
        <Animated.View
          style={[
            styles.orbWrapper,
            floatingStyle,
            pulseStyle,
          ]}
        >
          <EnergyOrb
            platformIcon={platformEmojis[childData.platformPreference]}
            percentage={Math.max(0, childData.completionPercent - energyDrain)}
            color={MOBILE_COLORS.neonBlue}
            onTap={() => {
              HAPTIC_PATTERNS.success();
              onSwitchPlatform?.(childData.id);
            }}
            size={180}
          />
        </Animated.View>

        {/* ── LIQUID FILL TIMER ──────────────────────────────── */}
        <View style={styles.timerSection}>
          <LiquidFillTimer
            percentage={Math.max(0, childData.completionPercent - energyDrain)}
            size={140}
            label="Daily Goal"
            animating={!isGaming}
          />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={styles.timerLabel}>Energy Status</Text>
            <Text style={styles.timerValue}>{childData.RP} RP</Text>
            <Text style={styles.timerValue} style={{ color: MOBILE_COLORS.neonRed, marginTop: 4 }}>
              {childData.GP} GP
            </Text>
          </View>
        </View>

        {/* ── CTA BUTTONS ────────────────────────────────────── */}
        <View style={styles.ctaRow}>
          <KineticButton
            title={isGaming ? '⏸ Stop Gaming' : '▶ Start Gaming'}
            onPress={() => {
              HAPTIC_PATTERNS.success();
              setIsGaming(!isGaming);
              setEnergyDrain(0);
              onStartSession?.(childData.id);
            }}
            variant="primary"
            size="large"
            style={{ flex: 1 }}
          />
          <KineticButton
            title="🎁 Redeem"
            onPress={() => {
              HAPTIC_PATTERNS.buttonPress();
              navigation?.navigate('Rewards');
            }}
            variant="secondary"
            size="large"
            style={{ flex: 1, marginLeft: 12 }}
          />
        </View>

        {/* ── PENDING TASKS (HORIZONTAL CAROUSEL) ─────────────── */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Text style={styles.sectionTitle}>📋 Pending Tasks</Text>
            <Text style={styles.taskCount}>{tasks.length}</Text>
          </View>

          {tasks.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              data={tasks}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    HAPTIC_PATTERNS.buttonPress();
                    setSelectedTask(item);
                    onTaskPress?.(item.id);
                  }}
                  activeOpacity={0.8}
                  style={{
                    width: width - 2 * SAFE_AREA.horizontal - 24,
                    marginRight: index < tasks.length - 1 ? 12 : 0,
                    marginLeft: index === 0 ? SAFE_AREA.horizontal + 12 : 0,
                  }}
                >
                  <Animated.View
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: MOBILE_COLORS.neonBlue,
                      backgroundColor: MOBILE_COLORS.surface,
                      padding: 16,
                    }}
                  >
                    <Text style={styles.taskTitle}>{item.title}</Text>
                    <Text style={styles.taskDescription}>{item.description}</Text>
                    <View style={styles.taskFooter}>
                      <Text style={styles.rpValue}>+{item.RPValue} RP</Text>
                      <Text style={styles.taskStatus}>{item.status}</Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              )}
              scrollEnabled
              key={tasks.length}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyText}>No pending tasks</Text>
              <Text style={styles.emptySubtext}>Wait for new tasks from your parents!</Text>
            </View>
          )}
        </View>

        {/* ── SIBLING PROGRESS (IF MULTIPLE CHILDREN) ────────── */}
        <View style={styles.siblingsSection}>
          <Text style={styles.sectionTitle}>👥 Family Progress</Text>
          <View style={styles.siblingsRow}>
            <ProgressOrb
              name="You"
              percentage={Math.max(0, childData.completionPercent - energyDrain)}
              color={MOBILE_COLORS.neonBlue}
            />
            <ProgressOrb
              name="Sibling"
              percentage={75}
              color={MOBILE_COLORS.neonGreen}
            />
            <ProgressOrb
              name="Other"
              percentage={45}
              color={MOBILE_COLORS.neonOrange}
            />
          </View>
        </View>

        {/* ── STATS CARDS ────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatsCard
            icon="🔥"
            label="Current Streak"
            value="7 days"
            color={MOBILE_COLORS.neonRed}
          />
          <StatsCard
            icon="⭐"
            label="This Week"
            value="450 RP"
            color={MOBILE_COLORS.neonBlue}
          />
          <StatsCard
            icon="🎯"
            label="Tasks Completed"
            value="23"
            color={MOBILE_COLORS.neonGreen}
          />
        </View>

        {/* Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * StatsCard Component
 */
function StatsCard({ icon, label, value, color }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: MOBILE_COLORS.surface,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <Text style={{ fontSize: 28, marginBottom: 4 }}>{icon}</Text>
      <Text style={{ ...MOBILE_TYPOGRAPHY.caption, color: MOBILE_COLORS.whiteAlpha6 }}>
        {label}
      </Text>
      <Text
        style={{
          ...MOBILE_TYPOGRAPHY.h3,
          color,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SAFE_AREA.horizontal,
    paddingVertical: 16,
    marginTop: SAFE_AREA.top,
  },

  greeting: {
    ...MOBILE_TYPOGRAPHY.h2,
    color: MOBILE_COLORS.primary,
  },

  subheading: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MOBILE_COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: MOBILE_COLORS.neonBlue,
  },

  profileEmoji: {
    fontSize: 24,
  },

  orbWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },

  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 16,
    backgroundColor: MOBILE_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.whiteAlpha3,
  },

  timerLabel: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginBottom: 4,
  },

  timerValue: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.neonBlue,
    fontWeight: '700',
  },

  ctaRow: {
    flexDirection: 'row',
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 12,
  },

  tasksSection: {
    marginVertical: 16,
  },

  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SAFE_AREA.horizontal,
    marginBottom: 12,
  },

  sectionTitle: {
    ...MOBILE_TYPOGRAPHY.h3,
    color: MOBILE_COLORS.primary,
    fontWeight: '700',
  },

  taskCount: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.neonBlue,
    backgroundColor: MOBILE_COLORS.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  taskTitle: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.primary,
    fontWeight: '600',
  },

  taskDescription: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: MOBILE_COLORS.whiteAlpha3,
  },

  rpValue: {
    ...MOBILE_TYPOGRAPHY.body,
    color: MOBILE_COLORS.neonBlue,
    fontWeight: '700',
  },

  taskStatus: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.neonOrange,
    textTransform: 'capitalize',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: SAFE_AREA.horizontal,
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },

  emptyText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.primary,
    fontWeight: '600',
  },

  emptySubtext: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  siblingsSection: {
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 16,
  },

  siblingsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: SAFE_AREA.horizontal,
    marginTop: 16,
  },
});

export default ChildDashboardKinetic;
