import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getApiUrl } from '../../api/client';
import { streamSSE } from '../../utils/sse';
import { colors } from '../../theme/colors';

// ─── Animated typing indicator ───────────────────────────────────────────────

function TypingIndicator({ color }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -5, duration: 220, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 220, useNativeDriver: true }),
          Animated.delay(380),
        ])
      );
    const anim = Animated.parallel([bounce(dot1, 0), bounce(dot2, 160), bounce(dot3, 320)]);
    anim.start();
    return () => anim.stop();
  }, [dot1, dot2, dot3]);

  const dotColor = color || colors.childAccent;
  const dotBase = { width: 7, height: 7, borderRadius: 3.5, backgroundColor: dotColor, marginHorizontal: 3 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 }}>
      <Animated.View style={[dotBase, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotBase, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotBase, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

// ─── Break timer modal ────────────────────────────────────────────────────────

const BREAK_ICONS = {
  eye_rest:  '👁️',
  stretch:   '🧘',
  hydration: '💧',
  snack:     '🍎',
  walk:      '🚶',
};

function BreakTimerModal({ timerData, onDismiss }) {
  const totalSecs = Math.max(1, Math.round((timerData.durationMinutes || 1) * 60));
  const [secsLeft, setSecsLeft] = useState(totalSecs);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (secsLeft <= 0) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setSecsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secsLeft]);

  const mins = String(Math.floor(secsLeft / 60)).padStart(2, '0');
  const secs = String(secsLeft % 60).padStart(2, '0');
  const progress = ((totalSecs - secsLeft) / totalSecs) * 100;

  const icon = BREAK_ICONS[timerData.breakType] || '⏱️';
  const msg = timerData.message || 'Time to take a break!';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.timerOverlay}>
        <View style={styles.timerCard}>
          <Text style={styles.timerIcon}>{icon}</Text>
          <Text style={styles.timerMsg}>{msg}</Text>

          {done ? (
            <Text style={styles.timerDone}>✅ Break complete!</Text>
          ) : (
            <Text style={styles.timerDisplay}>{mins}:{secs}</Text>
          )}

          {/* Progress bar */}
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${progress}%` }]} />
          </View>

          <TouchableOpacity style={styles.timerBtn} onPress={onDismiss}>
            <Text style={styles.timerBtnText}>{done ? '🎉 Done!' : 'Skip'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Stats card (shown inline in chat after get_my_stats) ────────────────────

function StatsCard({ stats }) {
  const items = [
    { label: 'RP Balance',  value: stats.rpBalance ?? 0,          color: colors.primary },
    { label: 'GP Balance',  value: stats.gpBalance ?? 0,          color: colors.warning },
    { label: 'Play Min',    value: stats.playableMinutes ?? 0,    color: colors.childAccent },
    { label: 'Today (min)', value: stats.gamingToday ?? 0,        color: colors.childAccentDark },
    { label: 'Tasks Done',  value: stats.weeklyCompletions ?? 0,  color: colors.secondary },
    { label: 'Active Tasks',value: stats.activeTasks ?? 0,        color: colors.textMuted },
  ];

  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>📊 Your Stats</Text>
      <View style={styles.statsGrid}>
        {items.map((item) => (
          <View key={item.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Chat message ─────────────────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
      {!isUser && (
        <View style={styles.avatarDot}>
          <Text style={styles.avatarDotText}>🤖</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Quick chips — context-aware ─────────────────────────────────────────────

const DEFAULT_CHIPS = [
  { label: 'My tasks',      text: 'What tasks do I have?' },
  { label: 'My points',     text: 'How many RP do I have?' },
  { label: 'What can I buy?', text: 'What can I buy with my points?' },
];

const TASK_CHIPS = [
  { label: 'Submit proof',       text: 'How do I submit proof for a task?' },
  { label: 'Ask for a new task', text: 'Can you suggest a new task I can do?' },
];

const REWARD_CHIPS = [
  { label: 'Redeem reward',    text: 'How do I redeem a reward?' },
  { label: 'Check my balance', text: 'What is my current RP balance?' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChildAiScreen() {
  const { token, user } = useAuth();
  const route = useRoute();
  const initialMessage = route.params?.initialMessage || null;
  const routeStreak = route.params?.streak ?? null;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  const [error, setError] = useState('');
  const [statsData, setStatsData] = useState(null);
  const [timerData, setTimerData] = useState(null);
  const [chipContext, setChipContext] = useState('default'); // 'default' | 'tasks' | 'rewards'

  const streamingTextRef = useRef('');
  const abortRef         = useRef(null);
  const listRef          = useRef(null);
  const typingQueueRef   = useRef([]);
  const typingDrainRef   = useRef(null);
  const typingShownRef   = useRef('');
  const initialMessageSentRef = useRef(false);

  function stopTypingDrain() {
    clearInterval(typingDrainRef.current);
    typingDrainRef.current = null;
    typingQueueRef.current = [];
    typingShownRef.current = '';
  }

  function startTypingDrain() {
    if (typingDrainRef.current) return;
    typingDrainRef.current = setInterval(() => {
      if (!typingQueueRef.current.length) return;
      const n = typingQueueRef.current.length > 50 ? 5
              : typingQueueRef.current.length > 20 ? 3
              : typingQueueRef.current.length >  5 ? 2
              : 1;
      typingShownRef.current += typingQueueRef.current.splice(0, n).join('');
      setStreamingText(typingShownRef.current);
    }, 28);
  }

  // Add a greeting on first mount, then auto-send initialMessage if present
  useEffect(() => {
    const name = user?.name || 'Explorer';
    setMessages([
      {
        role: 'assistant',
        content: `Hey ${name}! 👋 I'm your Study Buddy. I can help with homework, start break timers, or check your gaming stats. What do you need?`,
      },
    ]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-send initialMessage once messages are set
  useEffect(() => {
    if (!initialMessage || initialMessageSentRef.current || messages.length === 0) return;
    initialMessageSentRef.current = true;
    // Small delay to let the greeting render first
    const t = setTimeout(() => sendMessage(initialMessage), 300);
    return () => clearTimeout(t);
  }, [messages, initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopTypingDrain();
    };
  }, []);

  function scrollToBottom() {
    listRef.current?.scrollToEnd({ animated: true });
  }

  function sendMessage(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || streaming) return;

    setInput('');
    setError('');
    setStreaming(true);
    stopTypingDrain();
    streamingTextRef.current = '';
    setStreamingText('');
    setActiveTool(null);

    // Update chip context based on message topic
    const lower = trimmed.toLowerCase();
    if (lower.includes('task') || lower.includes('quest') || lower.includes('chore') || lower.includes('homework')) {
      setChipContext('tasks');
    } else if (lower.includes('reward') || lower.includes('redeem') || lower.includes('buy') || lower.includes('points') || lower.includes('rp') || lower.includes('gp')) {
      setChipContext('rewards');
    }

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

    const history = messages.slice(-16);

    // getApiUrl() is async (reads AsyncStorage) — await it before streaming
    getApiUrl().then((baseUrl) => {
      const url = `${baseUrl}/ai/child/chat`;
      abortRef.current = streamSSE(url, { message: trimmed, history }, token, (event) => {
      if (event.type === 'text') {
        streamingTextRef.current += event.delta || '';
        typingQueueRef.current.push(...(event.delta || '').split(''));
        startTypingDrain();
      } else if (event.type === 'tool_start') {
        setActiveTool(event.tool);
      } else if (event.type === 'tool_done') {
        setActiveTool(null);
        // Handle tool results that populate the canvas
        if (event.tool === 'get_my_stats' && event.data) {
          setStatsData(event.data);
        }
        if (event.tool === 'start_break_timer' && event.data) {
          setTimerData(event.data);
        }
      } else if (event.type === 'done') {
        const content = event.assistantMessage || streamingTextRef.current;
        stopTypingDrain();
        setMessages((prev) => [...prev, { role: 'assistant', content }]);
        streamingTextRef.current = '';
        setStreamingText('');
        setStreaming(false);
        setActiveTool(null);
      } else if (event.type === 'error') {
        stopTypingDrain();
        setError(event.message || 'Something went wrong — try again!');
        streamingTextRef.current = '';
        setStreamingText('');
        setStreaming(false);
        setActiveTool(null);
      }
      });
    }); // closes getApiUrl().then(
  }

  const listData = [...messages];
  if (streaming && streamingText) {
    listData.push({ role: 'assistant', content: streamingText + '▋', _key: 'streaming' });
  }

  // Determine streak to display — from route params or from user profile
  const displayStreak = routeStreak ?? (user?.streak ?? 0);
  const showStreakBanner = displayStreak > 1;

  // Pick chips based on conversation context
  const activeChips =
    chipContext === 'tasks'   ? TASK_CHIPS :
    chipContext === 'rewards' ? REWARD_CHIPS :
    DEFAULT_CHIPS;

  return (
    <View style={styles.root}>
      {/* Break timer modal */}
      {timerData && (
        <BreakTimerModal timerData={timerData} onDismiss={() => setTimerData(null)} />
      )}

      {/* Streak banner */}
      {showStreakBanner && (
        <View style={styles.streakBanner}>
          <Text style={styles.streakBannerText}>🔥 {displayStreak}-day streak! Keep it going!</Text>
        </View>
      )}

      {/* Stats card (inline, above the chat list) */}
      {statsData && (
        <View style={styles.statsWrap}>
          <StatsCard stats={statsData} />
          <TouchableOpacity onPress={() => setStatsData(null)} style={styles.statsDismiss}>
            <Text style={styles.statsDismissText}>✕ Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chat list */}
      <KeyboardAvoidingView
        style={styles.chatRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={112}
      >
        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item, i) => item._key || String(i)}
          renderItem={({ item }) => <ChatMessage msg={item} />}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          ListFooterComponent={
            activeTool ? (
              <View style={styles.toolBadge}>
                <ActivityIndicator size="small" color={colors.childAccentDark} />
                <Text style={styles.toolBadgeText}>
                  {activeTool === 'get_my_stats'
                    ? '📊 Fetching your stats…'
                    : activeTool === 'start_break_timer'
                    ? '⏱️ Setting up your break…'
                    : `⚙️ ${activeTool}…`}
                </Text>
              </View>
            ) : (streaming && !streamingText) ? (
              <View style={[styles.msgRow, styles.msgRowAssistant]}>
                <View style={styles.avatarDot}><Text style={styles.avatarDotText}>🤖</Text></View>
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <TypingIndicator color={colors.childAccent} />
                </View>
              </View>
            ) : null
          }
        />

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Context-aware quick chips — always shown when not streaming */}
        {!streaming && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {activeChips.map((chip) => (
              <TouchableOpacity
                key={chip.label}
                style={styles.chip}
                onPress={() => sendMessage(chip.text)}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Study Buddy…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={800}
            editable={!streaming}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || streaming}
          >
            {streaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendBtnText}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Streak banner
  streakBanner: {
    backgroundColor: colors.warningSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.streakFire + '44',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  streakBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.streakFire,
  },

  // Stats card wrapper
  statsWrap: {
    backgroundColor: colors.childAccentLight,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.childAccent + '55',
  },
  statsTitle: {
    fontWeight: '700',
    color: colors.childAccentDark,
    marginBottom: 10,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  statsDismiss: {
    alignItems: 'flex-end',
    paddingVertical: 6,
    paddingRight: 4,
  },
  statsDismissText: {
    color: colors.textMuted,
    fontSize: 12,
  },

  // Break timer modal
  timerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  timerCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  timerIcon: {
    fontSize: 52,
  },
  timerMsg: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  timerDisplay: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.childAccentDark,
    fontVariant: ['tabular-nums'],
  },
  timerDone: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.secondary,
  },
  timerTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    backgroundColor: colors.childAccent,
    borderRadius: 4,
  },
  timerBtn: {
    backgroundColor: colors.childAccent,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  timerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  // Chat
  chatRoot: {
    flex: 1,
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Messages
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.childAccentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDotText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.childAccent,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextUser: {
    color: '#fff',
  },
  bubbleTextAssistant: {
    color: colors.text,
  },

  // Tool badge
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.childAccentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 40,
  },
  toolBadgeText: {
    color: colors.childAccentDark,
    fontWeight: '600',
    fontSize: 13,
  },

  // Quick chips
  chipsScroll: {
    flexShrink: 0,
    paddingVertical: 6,
  },
  chipsRow: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: colors.childAccentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.childAccent + '55',
  },
  chipText: {
    color: colors.childAccentDark,
    fontWeight: '600',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },

  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.childAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.border,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18,
  },
});
