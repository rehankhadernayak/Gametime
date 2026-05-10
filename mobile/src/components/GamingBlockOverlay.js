import React from 'react';
import { Modal, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export function GamingBlockOverlay({ visible, code, onDismiss }) {
  const messages = {
    CAP_EXCEEDED: {
      title: 'Gaming Time Up',
      body: 'You\'ve reached your daily or weekly gaming cap. Great job staying on track! Check back tomorrow or earn more points.',
      icon: 'time-outline',
      color: colors.warning,
    },
    SESSION_NOT_ACTIVE: {
      title: 'Session Ended',
      body: 'Your gaming session has ended. Start a new one if you have time available.',
      icon: 'stop-circle-outline',
      color: colors.info,
    },
    SESSION_AUTO_ENDED: {
      title: 'Session Auto-Ended',
      body: 'Your session exceeded the granted time and was automatically ended.',
      icon: 'timer-outline',
      color: colors.warning,
    },
    DAILY_CAP_REACHED: {
      title: 'Daily Cap Reached',
      body: 'You\'ve used all your daily gaming minutes. Come back tomorrow!',
      icon: 'calendar-outline',
      color: colors.error,
    },
    WEEKLY_CAP_REACHED: {
      title: 'Weekly Cap Reached',
      body: 'You\'ve used all your weekly gaming minutes. Wait for next week.',
      icon: 'calendar-clear-outline',
      color: colors.error,
    },
    NO_MINUTES_FROM_POINTS: {
      title: 'No Gaming Time Available',
      body: 'Earn more points from completed tasks to unlock gaming minutes.',
      icon: 'trophy-outline',
      color: colors.secondary,
    },
  };

  const msg = messages[code] || messages.CAP_EXCEEDED;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons
            name={msg.icon}
            size={48}
            color={msg.color}
            style={styles.icon}
          />
          <Text style={styles.title}>{msg.title}</Text>
          <Text style={styles.body}>{msg.body}</Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}