import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, getApiUrl } from '../../api/client';
import { streamSSE } from '../../utils/sse';
import { colors } from '../../theme/colors';
import { getErrorMessage } from '../../utils/format';

// ─── Animated typing indicator (3 bouncing dots) ─────────────────────────────

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

  const dotColor = color || colors.textMuted;
  const dotBase = { width: 7, height: 7, borderRadius: 3.5, backgroundColor: dotColor, marginHorizontal: 3 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 }}>
      <Animated.View style={[dotBase, { transform: [{ translateY: dot1 }] }]} />
      <Animated.View style={[dotBase, { transform: [{ translateY: dot2 }] }]} />
      <Animated.View style={[dotBase, { transform: [{ translateY: dot3 }] }]} />
    </View>
  );
}

// ─── Tool badge (shown while Claude calls a function) ────────────────────────

const TOOL_LABELS = {
  get_family_overview:   'Loading family overview…',
  get_pending_approvals: 'Loading pending approvals…',
  approve_task:          'Approving task…',
  reject_task:           'Rejecting task…',
  create_task:           'Creating task…',
  create_reward:         'Creating reward…',
};

function ToolBadge({ tool }) {
  const label = TOOL_LABELS[tool] || `Running ${tool}…`;
  return (
    <View style={styles.toolBadge}>
      <ActivityIndicator size="small" color={colors.primaryDark} style={{ marginRight: 8 }} />
      <Text style={styles.toolBadgeText}>{label}</Text>
    </View>
  );
}

// ─── Chat message bubble ─────────────────────────────────────────────────────

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
      {!isUser && (
        <View style={styles.avatarDot}>
          <Text style={styles.avatarDotText}>G</Text>
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

// ─── Quick action chips ────────────────────────────────────────────────────────

const AI_CHIPS = [
  { label: 'What needs attention?', prompt: 'What needs my attention right now? Check for pending approvals.' },
  { label: 'Family overview',       prompt: 'Show me an overview of my family — children, their balances, and current tasks.' },
  { label: 'Create a quest',        prompt: 'I want to create a new quest for one of my children.' },
  { label: 'Add a reward',          prompt: 'I want to create a reward my children can redeem with their points.' },
  { label: 'Plan this week',        prompt: "Help me plan this week's quests and gaming limits for my children." },
];

function ChipsBar({ onChip, disabled }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
      keyboardShouldPersistTaps="handled"
    >
      {AI_CHIPS.map((c) => (
        <TouchableOpacity
          key={c.label}
          style={styles.chip}
          onPress={() => onChip(c.prompt)}
          disabled={disabled}
        >
          <Text style={styles.chipText}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Action buttons (shown below AI messages after SSE actions event) ─────────

function ActionButtons({ actions, token, onFeedback }) {
  const [busyIdx, setBusyIdx] = useState(null);
  const [doneIdx, setDoneIdx] = useState(null);

  if (!actions || actions.length === 0) return null;

  async function handleAction(action, idx) {
    if (busyIdx !== null) return;
    setBusyIdx(idx);
    try {
      await apiRequest(action.endpoint, {
        method: action.method || 'POST',
        token,
        body: action.body || undefined,
      });
      setDoneIdx(idx);
      if (onFeedback) onFeedback(`Done: ${action.label}`);
    } catch {
      if (onFeedback) onFeedback(`Failed: ${action.label}`);
    } finally {
      setBusyIdx(null);
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.actionBtnsRow}
    >
      {actions.map((action, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.actionBtn,
            doneIdx === idx && styles.actionBtnDone,
            busyIdx === idx && styles.actionBtnBusy,
          ]}
          onPress={() => handleAction(action, idx)}
          disabled={busyIdx !== null}
          activeOpacity={0.75}
        >
          {busyIdx === idx
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[styles.actionBtnText, doneIdx === idx && styles.actionBtnTextDone]}>
                {doneIdx === idx ? '✓ ' : ''}{action.label}
              </Text>
          }
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Chat tab ────────────────────────────────────────────────────────────────

function ChatTab({ token }) {
  const [messages, setMessages] = useState([]);
  const [messageActions, setMessageActions] = useState({}); // { msgIndex: actions[] }
  const [briefingActions, setBriefingActions] = useState([]);
  const [actionFeedback, setActionFeedback] = useState('');
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTool, setActiveTool] = useState(null);
  const [error, setError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const streamingTextRef = useRef('');
  const abortRef         = useRef(null);
  const listRef          = useRef(null);
  const typingQueueRef   = useRef([]);
  const typingDrainRef   = useRef(null);
  const typingShownRef   = useRef('');

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

  // Load persisted history + morning briefing on mount
  useEffect(() => {
    async function load() {
      let initialMessages = [];
      try {
        const { messages: hist } = await apiRequest('/ai/history', { token });
        initialMessages = hist || [];
      } catch {
        // history unavailable — start fresh
      }

      // Fetch morning briefing and prepend as first AI message
      try {
        const brief = await apiRequest('/ai/family-briefing', { token });
        if (brief?.briefing) {
          const { briefing, stats, actions } = brief;
          const streakWarning = (stats?.streakRisk?.length ?? 0) > 0 ? ' · streak risk' : '';
          const briefingMsg = `${briefing}\n\n${stats?.pendingApprovals ?? 0} pending · ${stats?.weeklyRp ?? 0} RP this week${streakWarning}`;
          initialMessages = [{ role: 'assistant', content: briefingMsg, _briefing: true }, ...initialMessages];
          if (Array.isArray(actions) && actions.length > 0) {
            setBriefingActions(actions);
          }
        }
      } catch {
        // briefing unavailable — skip silently
      }

      setMessages(initialMessages);
      setHistoryLoaded(true);
    }
    load();
  }, [token]);

  // Scroll to bottom whenever content changes
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  function send(overrideText) {
    const trimmed = (overrideText ?? input).trim();
    if (!trimmed || streaming) return;

    if (!overrideText) setInput('');
    setError('');
    setStreaming(true);
    stopTypingDrain();
    streamingTextRef.current = '';
    setStreamingText('');
    setActiveTool(null);

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);

    // Only send recent context to keep payload small
    const history = messages.slice(-20);

    // Track pending actions from this stream
    let pendingActions = null;

    // getApiUrl() is async (reads AsyncStorage) — await it before streaming
    getApiUrl().then((baseUrl) => {
      const url = `${baseUrl}/ai/chat`;
      abortRef.current = streamSSE(url, { message: trimmed, history }, token, (event) => {
      if (event.type === 'text') {
        streamingTextRef.current += event.delta || '';
        typingQueueRef.current.push(...(event.delta || '').split(''));
        startTypingDrain();
      } else if (event.type === 'tool_start') {
        setActiveTool(event.tool);
      } else if (event.type === 'tool_done') {
        setActiveTool(null);
      } else if (event.type === 'actions') {
        // Final event with action buttons
        if (Array.isArray(event.actions) && event.actions.length > 0) {
          pendingActions = event.actions;
        }
      } else if (event.type === 'done') {
        const content = event.assistantMessage || streamingTextRef.current;
        stopTypingDrain();
        setMessages((prev) => {
          const next = [...prev, { role: 'assistant', content }];
          // Attach actions to this message index
          if (pendingActions) {
            const idx = next.length - 1;
            setMessageActions((ma) => ({ ...ma, [idx]: pendingActions }));
          }
          return next;
        });
        streamingTextRef.current = '';
        setStreamingText('');
        setStreaming(false);
        setActiveTool(null);
      } else if (event.type === 'error') {
        stopTypingDrain();
        setError(event.message || 'AI error — please try again.');
        streamingTextRef.current = '';
        setStreamingText('');
        setStreaming(false);
        setActiveTool(null);
      }
      });
    }); // closes getApiUrl().then(
  }

  function handleActionFeedback(msg) {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(''), 3000);
  }

  // Abort + drain cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopTypingDrain();
    };
  }, []);

  // Build list data including in-progress streaming message
  const listData = [...messages];
  if (streaming && streamingText) {
    listData.push({ role: 'assistant', content: streamingText + '▋', _key: 'streaming' });
  }

  if (!historyLoaded) {
    return (
      <View style={styles.centeredFlex}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={112}
    >
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(item, i) => item._key || String(i)}
        renderItem={({ item, index }) => (
          <View>
            <ChatMessage msg={item} />
            {/* Action buttons below assistant messages that have actions */}
            {item.role === 'assistant' && messageActions[index] && (
              <View style={styles.actionBtnsWrap}>
                <ActionButtons
                  actions={messageActions[index]}
                  token={token}
                  onFeedback={handleActionFeedback}
                />
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>AI</Text>
            <Text style={styles.emptyTitle}>Gametime AI</Text>
            <Text style={styles.emptyDesc}>
              Ask me anything — gaming rules, task ideas, your family's weekly summary, or how to
              set better boundaries.
            </Text>
          </View>
        }
        ListFooterComponent={
          activeTool
            ? <ToolBadge tool={activeTool} />
            : (streaming && !streamingText)
            ? (
                <View style={[styles.msgRow, styles.msgRowAssistant]}>
                  <View style={styles.avatarDot}><Text style={styles.avatarDotText}>G</Text></View>
                  <View style={[styles.bubble, styles.bubbleAssistant]}>
                    <TypingIndicator color={colors.textMuted} />
                  </View>
                </View>
              )
            : null
        }
      />

      {!!error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Action feedback toast */}
      {!!actionFeedback && (
        <View style={styles.feedbackToast}>
          <Text style={styles.feedbackToastText}>{actionFeedback}</Text>
        </View>
      )}

      {/* Briefing quick actions above input */}
      {briefingActions.length > 0 && !streaming && (
        <View style={styles.briefingActionsWrap}>
          <Text style={styles.briefingActionsLabel}>Quick actions from briefing:</Text>
          <ActionButtons
            actions={briefingActions}
            token={token}
            onFeedback={handleActionFeedback}
          />
        </View>
      )}

      {/* Quick chips */}
      {historyLoaded && !streaming && <ChipsBar onChip={send} disabled={streaming} />}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask Gametime AI…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={1000}
          editable={!streaming}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || streaming}
        >
          {streaming
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendBtnText}>↑</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Insights tab ─────────────────────────────────────────────────────────────

function HealthBar({ score }) {
  const pct = Math.max(0, Math.min(100, score));
  const fillColor = pct >= 70 ? colors.secondary : pct >= 40 ? colors.warning : colors.danger;
  return (
    <View style={styles.healthTrack}>
      <View style={[styles.healthFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

function ChildCard({ child }) {
  const score = child.healthyBalanceScore ?? 0;
  const scoreColor = score >= 70 ? colors.secondary : score >= 40 ? colors.warning : colors.danger;
  const topGames = (child.topGames || []).map((g) => g.gameName).join(', ');

  return (
    <View style={styles.childCard}>
      <View style={styles.childCardHeader}>
        <Text style={styles.childCardName}>{child.childName}</Text>
        <View style={[styles.scorePill, { borderColor: scoreColor }]}>
          <Text style={[styles.scorePillText, { color: scoreColor }]}>{score}/100</Text>
        </View>
      </View>

      <HealthBar score={score} />

      <View style={styles.childStats}>
        <Text style={styles.childStat}>{child.totalGamingMinutes ?? 0} min gaming this week</Text>
        <Text style={styles.childStat}>{child.tasksCompletedThisWeek ?? 0} tasks done</Text>
        {child.lateNightSessions > 0 && (
          <Text style={[styles.childStat, { color: colors.warning }]}>
            {child.lateNightSessions} late-night session{child.lateNightSessions !== 1 ? 's' : ''}
          </Text>
        )}
        {topGames ? <Text style={styles.childStat}>Top games: {topGames}</Text> : null}
      </View>
    </View>
  );
}

function InsightsTab({ token }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const result = await apiRequest('/ai/parent/insights', { token });
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <View style={styles.insightsEmpty}>
        <Text style={styles.insightsEmptyIcon}>AI</Text>
        <Text style={styles.insightsEmptyTitle}>Family Insights</Text>
        <Text style={styles.insightsEmptyDesc}>
          Get an AI-powered snapshot of your children's gaming habits and task performance this week.
        </Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        <TouchableOpacity style={styles.genBtn} onPress={generate} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.genBtnText}>Generate Insights</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.insightsScroll}>
      {!!data.narrative && (
        <View style={styles.narrativeCard}>
          <Text style={styles.narrativeTitle}>AI Summary</Text>
          <Text style={styles.narrativeText}>{data.narrative}</Text>
        </View>
      )}

      {(data.children || []).map((child) => (
        <ChildCard key={child.childId} child={child} />
      ))}

      <TouchableOpacity style={[styles.genBtn, { marginTop: 12 }]} onPress={generate} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.genBtnText}>↺ Refresh</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

const TAB_CHAT = 'chat';
const TAB_INSIGHTS = 'insights';

export default function ParentAiScreen() {
  const { token } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(TAB_CHAT);

  return (
    <View style={styles.root} testID="parent-app-home">
      <StatusBar barStyle="dark-content" />

      {/* AI header — paddingTop accounts for notch / Dynamic Island */}
      <View style={[styles.aiHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.aiBrandRow}>
          <View style={styles.aiBrand}>
            <View style={styles.aiBrandDot} />
            <Text style={styles.aiBrandName}>Gametime AI</Text>
            <View style={styles.aiBetaPill}><Text style={styles.aiBetaText}>Beta</Text></View>
          </View>
          <View style={styles.aiHeaderActions}>
            <TouchableOpacity onPress={() => navigation.navigate('ParentNotifications')} style={styles.aiHeaderBtn} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={20} color={colors.primaryDark} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Account')} style={styles.aiHeaderBtn} accessibilityLabel="Account">
              <Ionicons name="person-circle-outline" size={22} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_CHAT && styles.tabActive]}
            onPress={() => setTab(TAB_CHAT)}
          >
            <Text style={[styles.tabText, tab === TAB_CHAT && styles.tabTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === TAB_INSIGHTS && styles.tabActive]}
            onPress={() => setTab(TAB_INSIGHTS)}
          >
            <Text style={[styles.tabText, tab === TAB_INSIGHTS && styles.tabTextActive]}>Insights</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab content */}
      <View style={styles.tabContent}>
        {tab === TAB_CHAT
          ? <ChatTab token={token} />
          : <InsightsTab token={token} />}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // AI header — paddingTop is applied dynamically via insets.top + 12
  aiHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aiBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  aiHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiHeaderBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  aiBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiBrandDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
  },
  aiBrandName: {
    fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.3,
  },
  aiBetaPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 999,
  },
  aiBetaText: {
    fontSize: 10, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 0.5,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabContent: {
    flex: 1,
  },

  // Loading / centered
  centeredFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat tab
  chatRoot: {
    flex: 1,
  },
  chatList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  emptyDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Message bubbles
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDotText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 12,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 36,
  },
  toolBadgeText: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
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

  // Action buttons
  actionBtnsWrap: {
    marginLeft: 36,
    marginBottom: 8,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    minHeight: 32,
    justifyContent: 'center',
  },
  actionBtnDone: {
    borderColor: colors.secondary,
    backgroundColor: colors.successSurface,
  },
  actionBtnBusy: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionBtnTextDone: {
    color: colors.secondary,
  },

  // Briefing quick actions
  briefingActionsWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  briefingActionsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  // Action feedback toast
  feedbackToast: {
    backgroundColor: colors.text,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  feedbackToastText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick chips
  chipsRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
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
    backgroundColor: colors.primary,
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

  // Insights tab — empty state
  insightsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  insightsEmptyIcon: {
    fontSize: 48,
  },
  insightsEmptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  insightsEmptyDesc: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Insights — scrollable results
  insightsScroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  // Narrative card
  narrativeCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  narrativeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  narrativeText: {
    color: colors.text,
    lineHeight: 22,
    fontSize: 15,
  },

  // Per-child insight card
  childCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    gap: 10,
  },
  childCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  scorePill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  scorePillText: {
    fontWeight: '700',
    fontSize: 13,
  },
  healthTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 4,
  },
  childStats: {
    gap: 4,
  },
  childStat: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },

  // Generate button
  genBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  genBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
