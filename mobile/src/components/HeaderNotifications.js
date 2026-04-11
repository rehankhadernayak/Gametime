import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { colors } from '../theme/colors';
import { fmtDateTime, getErrorMessage } from '../utils/format';

export default function HeaderNotifications() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadNotifications() {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const list = await apiRequest('/notifications/list', { token });
      setNotifications(list);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    loadNotifications();
    const timer = setInterval(loadNotifications, 25000);
    return () => clearInterval(timer);
  }, [token]);

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.read).map((item) => item.id),
    [notifications]
  );

  async function markAllRead() {
    if (!unreadIds.length) return;
    try {
      await apiRequest('/notifications/markRead', {
        method: 'POST',
        token,
        body: { notificationIds: unreadIds }
      });
      await loadNotifications();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <>
      <Pressable
        onPress={async () => {
          const next = !open;
          setOpen(next);
          if (next) await loadNotifications();
        }}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
      >
        <Ionicons name="notifications-outline" size={18} color={colors.primaryDark} />
        {unreadIds.length > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{Math.min(unreadIds.length, 99)}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[styles.panel, { marginTop: insets.top + 56 }]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <Pressable onPress={markAllRead} disabled={!unreadIds.length}>
                <Text style={[styles.markRead, !unreadIds.length && styles.markReadDisabled]}>Mark all read</Text>
              </Pressable>
            </View>
            {busy ? <Text style={styles.note}>Loading notifications...</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!busy && notifications.length === 0 ? <Text style={styles.note}>No notifications yet.</Text> : null}
            <ScrollView style={styles.list}>
              {notifications.slice(0, 25).map((item) => (
                <View key={item.id} style={[styles.item, !item.read && styles.itemUnread]}>
                  <Text style={styles.itemMessage}>{item.message}</Text>
                  <Text style={styles.itemMeta}>{fmtDateTime(item.createdAt)}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    marginRight: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.danger,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700'
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'flex-end',
    paddingRight: 10
  },
  panel: {
    width: 340,
    maxWidth: '94%',
    maxHeight: '72%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  title: {
    color: colors.text,
    fontWeight: '700'
  },
  markRead: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 12
  },
  markReadDisabled: {
    opacity: 0.45
  },
  note: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 8
  },
  list: {
    flexGrow: 0
  },
  item: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    marginBottom: 7,
    backgroundColor: '#F9FBFF'
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  itemMessage: {
    color: colors.text,
    fontSize: 13
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3
  }
});
