/**
 * Parent Mobile Kinetic Component
 * Mobile dashboard for parents with quick approve/reject swipes
 * Fully integrated with backend API + real-time polling
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  MOBILE_COLORS,
  MOBILE_TYPOGRAPHY,
  SAFE_AREA,
  HAPTIC_PATTERNS,
  usePulseAnimation,
} from '../theme/kinetic-mobile-theme.js';
import {
  KineticButton,
  ProgressOrb,
  SwipeCard,
  TerminalLine,
} from '../components/shared-mobile-components.js';
import { useAuth } from '../context/AuthContext.js';
import usePendingTasks from '../hooks/usePendingTasks.js';
import useParentProfile from '../hooks/useParentProfile.js';

const { width } = Dimensions.get('window');

/**
 * ParentMobileKinetic
 * Fully integrated parent dashboard with real API calls
 */
export function ParentMobileKinetic({ navigation }) {
  const { user, token } = useAuth();
  const { parentData, loading: profileLoading, refresh: refreshProfile } = useParentProfile(token);
  const {
    tasks: pendingTasks,
    loading: tasksLoading,
    error: tasksError,
    approve,
    reject,
    refresh: refreshTasks,
  } = usePendingTasks(token);

  const [selectedChild, setSelectedChild] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState([
    { text: 'Gametime Parent Terminal v1.0', type: 'system' },
    { text: 'Type !help for commands', type: 'system' },
  ]);
  const [refreshing, setRefreshing] = useState(false);

  // Pulse animation for notification
  const { animatedStyle: pulseStyle } = usePulseAnimation(1, 1.1, 1500);

  // Show notification when pending tasks arrive
  useEffect(() => {
    if (pendingTasks.length > 0 && !showNotification) {
      setShowNotification(true);
      HAPTIC_PATTERNS.success();
      setTimeout(() => setShowNotification(false), 5000);
    }
  }, [pendingTasks.length]);

  const children = parentData?.children || [];

  // Calculate child stats from pending tasks
  const childStats = children.map((child) => {
    const childTasks = pendingTasks.filter((t) => t.childId === child.id);
    const totalRP = childTasks.reduce((sum, t) => sum + (t.rpValue || 0), 0);
    return {
      ...child,
      pendingCount: childTasks.length,
      RP: totalRP,
    };
  });

  const filteredTasks = selectedChild
    ? pendingTasks.filter((t) => t.childId === selectedChild)
    : pendingTasks;

  const handleTaskApprove = async (taskId) => {
    HAPTIC_PATTERNS.success();
    try {
      const result = await approve(taskId);
      if (result.success) {
        Alert.alert('Task Approved', '✓ Child earned their points!');
      } else {
        Alert.alert('Error', result.error || 'Failed to approve task');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to approve task');
    }
  };

  const handleTaskReject = async (taskId) => {
    HAPTIC_PATTERNS.error();
    try {
      const result = await reject(taskId);
      if (result.success) {
        Alert.alert('Task Rejected', 'Child needs to resubmit evidence');
      } else {
        Alert.alert('Error', result.error || 'Failed to reject task');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reject task');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), refreshTasks()]);
    setRefreshing(false);
  };

  const handleTerminalCommand = (command) => {
    const newLines = [
      ...terminalLines,
      { text: command, type: 'user' },
    ];

    let response = '';
    if (command.includes('insights')) {
      response = 'Weekly: ' + pendingTasks.length + ' pending tasks, ' + children.length + ' children';
    } else if (command.includes('recommend')) {
      response = 'Review pending tasks. Current RP to award: ' + pendingTasks.reduce((s, t) => s + (t.rpValue || 0), 0);
    } else if (command.includes('child')) {
      response = 'Child dashboard available via navigation';
    } else if (command.includes('clear')) {
      setTerminalLines([
        { text: 'Terminal cleared', type: 'system' },
      ]);
      return;
    } else {
      response = 'Command not found. Try !insights, !recommend, or !child';
    }

    newLines.push({ text: response, type: 'system' });
    setTerminalLines(newLines);
  };

  // Loading state
  if (profileLoading && !parentData.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MOBILE_COLORS.neonBlue} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── NOTIFICATION BANNER ────────────────────────────── */}
      {showNotification && pendingTasks.length > 0 && (
        <Animated.View
          style={[
            styles.notificationBanner,
            pulseStyle,
          ]}
        >
          <View style={styles.notificationContent}>
            <Text style={styles.notificationEmoji}>📬</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.notificationTitle}>New Submission</Text>
              <Text style={styles.notificationText}>
                {pendingTasks[0]?.childName || 'Child'} submitted evidence
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowNotification(false)}
              style={styles.notificationDismiss}
            >
              <Text>✕</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={MOBILE_COLORS.neonBlue}
          />
        }
      >
        {/* ── HEADER ─────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerGreeting}>Welcome back, {parentData?.name || 'Parent'}!</Text>
            <Text style={styles.headerSubtext}>
              {pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending review
            </Text>
          </View>
        </View>

        {/* ── CHILD GRID ─────────────────────────────────── */}
        <View style={styles.childrenSection}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Your Children</Text>
          {children.length > 0 ? (
            <View style={styles.childGrid}>
              {childStats.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => {
                    HAPTIC_PATTERNS.buttonPress();
                    setSelectedChild(
                      selectedChild === child.id ? null : child.id
                    );
                  }}
                  style={[
                    styles.childCard,
                    selectedChild === child.id && styles.childCardActive,
                  ]}
                >
                  <ProgressOrb
                    name={child.name}
                    percentage={child.pendingCount * 25} // Scale 0-100
                    color={MOBILE_COLORS.neonBlue}
                  />
                  <Text style={styles.childName}>{child.name}</Text>
                  {child.pendingCount > 0 && (
                    <Text style={styles.childPending}>{child.pendingCount} pending</Text>
                  )}
                  <Text style={styles.childPoints}>{child.RP} RP</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.errorText}>No children added yet</Text>
          )}
        </View>

        {/* ── PENDING TASKS SWIPEABLE LIST ───────────────── */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksHeader}>
            <Text style={styles.sectionTitle}>📋 Pending Tasks</Text>
            <Text style={styles.taskBadge}>{filteredTasks.length}</Text>
          </View>

          {tasksError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {tasksError}</Text>
              <KineticButton
                title="Retry"
                onPress={refreshTasks}
                variant="secondary"
                size="small"
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {tasksLoading && !pendingTasks.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={MOBILE_COLORS.neonBlue} />
            </View>
          ) : filteredTasks.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={filteredTasks}
              renderItem={({ item }) => (
                <View
                  key={item.id}
                  style={styles.taskSwipeContainer}
                >
                  <SwipeCard
                    title={item.title}
                    subtitle={`${item.childName} · +${item.rpValue || 0} RP`}
                    status={item.status}
                    icon="📸"
                  />

                  {/* Quick Action Buttons Below Card */}
                  <View style={styles.quickActionRow}>
                    <KineticButton
                      title="⏱ Review"
                      onPress={() => {
                        HAPTIC_PATTERNS.buttonPress();
                        navigation?.navigate('TaskDetail', { taskId: item.id });
                      }}
                      variant="secondary"
                      size="small"
                      style={{ flex: 1 }}
                    />

                    <KineticButton
                      title="✓ Approve"
                      onPress={() => handleTaskApprove(item.id)}
                      variant="primary"
                      size="small"
                      style={{ flex: 1, marginLeft: 8 }}
                    />

                    <KineticButton
                      title="✕ Reject"
                      onPress={() => handleTaskReject(item.id)}
                      variant="danger"
                      size="small"
                      style={{ flex: 1, marginLeft: 8 }}
                    />
                  </View>
                </View>
              )}
              keyExtractor={(item) => item.id || Math.random().toString()}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>
                {selectedChild ? 'No pending tasks for this child' : 'No pending tasks'}
              </Text>
            </View>
          )}
        </View>

        {/* ── STATS SUMMARY ──────────────────────────────── */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>📊 Summary</Text>
          <View style={styles.statsRow}>
            <StatBlock
              icon="⏳"
              label="Pending"
              value={String(pendingTasks.length)}
              color={MOBILE_COLORS.neonOrange}
            />
            <StatBlock
              icon="👶"
              label="Children"
              value={String(children.length)}
              color={MOBILE_COLORS.neonBlue}
            />
            <StatBlock
              icon="⭐"
              label="Total RP"
              value={pendingTasks.reduce((s, t) => s + (t.rpValue || 0), 0)}
              color={MOBILE_COLORS.neonGreen}
            />
          </View>
        </View>

        {/* ── TERMINAL TOGGLE ────────────────────────────── */}
        <TouchableOpacity
          onPress={() => {
            HAPTIC_PATTERNS.lightTap();
            setTerminalOpen(!terminalOpen);
          }}
          style={styles.terminalToggleButton}
        >
          <Text style={styles.terminalToggleText}>
            {terminalOpen ? '▼ Close Terminal' : '▶ AI Terminal'}
          </Text>
        </TouchableOpacity>

        {/* ── TERMINAL ────────────────────────────────────── */}
        {terminalOpen && (
          <View style={styles.terminalContainer}>
            <View style={styles.terminalOutput}>
              {terminalLines.map((line, idx) => (
                <TerminalLine
                  key={idx}
                  text={line.text}
                  type={line.type}
                />
              ))}
            </View>

            <View style={styles.terminalFastCommands}>
              {['!insights', '!recommend', '!child'].map((cmd) => (
                <TouchableOpacity
                  key={cmd}
                  onPress={() => handleTerminalCommand(cmd)}
                  style={styles.fastCommandButton}
                >
                  <Text style={styles.fastCommandText}>{cmd}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FLOATING ACTION BUTTON ────────────────────────── */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => {
          HAPTIC_PATTERNS.success();
          navigation?.navigate('CreateTask');
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/**
 * StatBlock Component
 */
function StatBlock({ icon, label, value, color }) {
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
        marginHorizontal: 4,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 4 }}>{icon}</Text>
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
    backgroundColor: MOBILE_COLORS.primary,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },

  loadingText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 12,
  },

  errorContainer: {
    backgroundColor: MOBILE_COLORS.neonRed + '20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.neonRed + '40',
    padding: 12,
    marginBottom: 12,
  },

  errorText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.neonRed,
  },

  notificationBanner: {
    marginHorizontal: SAFE_AREA.horizontal,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: MOBILE_COLORS.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: MOBILE_COLORS.neonBlue,
    padding: 12,
  },

  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  notificationEmoji: {
    fontSize: 24,
  },

  notificationTitle: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.white,
    fontWeight: '600',
  },

  notificationText: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 2,
  },

  notificationDismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {
    paddingHorizontal: SAFE_AREA.horizontal,
    paddingVertical: 16,
  },

  headerGreeting: {
    ...MOBILE_TYPOGRAPHY.h2,
    color: MOBILE_COLORS.white,
  },

  headerSubtext: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  childrenSection: {
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 16,
  },

  sectionTitle: {
    ...MOBILE_TYPOGRAPHY.h3,
    color: MOBILE_COLORS.white,
    fontWeight: '700',
    marginBottom: 12,
  },

  childGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  childCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.whiteAlpha3,
    backgroundColor: MOBILE_COLORS.surface,
  },

  childCardActive: {
    borderWidth: 2,
    borderColor: MOBILE_COLORS.neonBlue,
    backgroundColor: `${MOBILE_COLORS.neonBlue}10`,
  },

  childName: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.white,
    marginTop: 8,
    fontWeight: '600',
  },

  childPending: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.neonOrange,
    marginTop: 2,
    fontSize: 10,
  },

  childPoints: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.neonBlue,
    marginTop: 2,
  },

  tasksSection: {
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 16,
  },

  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  taskBadge: {
    ...MOBILE_TYPOGRAPHY.caption,
    backgroundColor: MOBILE_COLORS.neonRed,
    color: MOBILE_COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '700',
  },

  taskSwipeContainer: {
    marginBottom: 12,
  },

  quickActionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },

  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.white,
    fontWeight: '600',
  },

  emptySubtext: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.whiteAlpha6,
    marginTop: 4,
  },

  statsSection: {
    paddingHorizontal: SAFE_AREA.horizontal,
    marginVertical: 16,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  terminalToggleButton: {
    marginHorizontal: SAFE_AREA.horizontal,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.neonGreen,
    backgroundColor: `${MOBILE_COLORS.neonGreen}10`,
    marginVertical: 12,
  },

  terminalToggleText: {
    ...MOBILE_TYPOGRAPHY.bodySmall,
    color: MOBILE_COLORS.neonGreen,
    fontWeight: '600',
    textAlign: 'center',
  },

  terminalContainer: {
    marginHorizontal: SAFE_AREA.horizontal,
    backgroundColor: '#0a0e27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${MOBILE_COLORS.neonGreen}30`,
    padding: 12,
    marginVertical: 12,
  },

  terminalOutput: {
    marginBottom: 12,
    maxHeight: 200,
  },

  terminalFastCommands: {
    flexDirection: 'row',
    gap: 8,
  },

  fastCommandButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: MOBILE_COLORS.neonGreen,
    backgroundColor: `${MOBILE_COLORS.neonGreen}15`,
  },

  fastCommandText: {
    ...MOBILE_TYPOGRAPHY.caption,
    color: MOBILE_COLORS.neonGreen,
    textAlign: 'center',
    fontWeight: '600',
  },

  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: MOBILE_COLORS.neonRed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MOBILE_COLORS.neonRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  fabText: {
    fontSize: 36,
    color: MOBILE_COLORS.white,
    fontWeight: '700',
  },
});

export default ParentMobileKinetic;
