import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { apiRequest, DEMO_PNG_BASE64, isDemoMode } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing, radius } from '../../theme/spacing';
import { getErrorMessage } from '../../utils/format';

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ current }) {
  return (
    <View style={dotStyles.row}>
      {[1, 2, 3].map((step) => {
        const isCurrent = step === current;
        const isPast = step < current;
        return (
          <View
            key={step}
            style={[
              dotStyles.dot,
              isCurrent && dotStyles.dotCurrent,
              isPast && dotStyles.dotPast,
            ]}
          />
        );
      })}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.childAccent,
  },
  dotPast: { backgroundColor: colors.secondary },
});

// ─── Step header ──────────────────────────────────────────────────────────────

function StepHeader({ title, step, onBack }) {
  return (
    <View style={headerStyles.bar}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
        style={headerStyles.backBtn}
      >
        <Text style={headerStyles.backIcon}>‹</Text>
      </TouchableOpacity>
      <Text style={headerStyles.title}>{title}</Text>
      <ProgressDots current={step} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 28, color: colors.text, lineHeight: 32, marginTop: -2 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
});

// ─── Step 1 — Task Overview ───────────────────────────────────────────────────

function TaskOverview({ taskTitle, taskPoints, onPhoto, onVideo, onLibrary }) {
  return (
    <ScrollView contentContainerStyle={s1.container} showsVerticalScrollIndicator={false}>
      {/* Task card — purple gradient via layered views */}
      <View style={s1.card}>
        <View style={s1.cardGradient} />
        <View style={s1.rpPill}>
          <Text style={s1.rpText}>+{taskPoints} RP</Text>
        </View>
        <Text style={s1.cardTitle}>{taskTitle}</Text>
        <Text style={s1.cardSub}>Take a photo or short video showing your completed task</Text>
      </View>

      <Text style={s1.motivate}>Keep it up — you're doing great!</Text>

      {/* Photo button */}
      <TouchableOpacity style={[s1.choiceBtn, s1.photoBtn]} onPress={onPhoto} activeOpacity={0.8}>
        <View style={[s1.choiceIcon, { backgroundColor: '#F3E8FF' }]}>
          <Text style={s1.choiceIconText}>CAM</Text>
        </View>
        <View style={s1.choiceText}>
          <Text style={s1.choiceTitle}>Take a Photo</Text>
          <Text style={s1.choiceSub}>Snap a quick picture</Text>
        </View>
        <Text style={[s1.choiceArrow, { color: colors.childAccent }]}>›</Text>
      </TouchableOpacity>

      {/* Video button */}
      <TouchableOpacity style={[s1.choiceBtn, s1.videoBtn]} onPress={onVideo} activeOpacity={0.8}>
        <View style={[s1.choiceIcon, { backgroundColor: '#DBEAFE' }]}>
          <Text style={s1.choiceIconText}>VID</Text>
        </View>
        <View style={s1.choiceText}>
          <Text style={s1.choiceTitle}>Record a Video</Text>
          <Text style={s1.choiceSub}>Up to 30 seconds</Text>
        </View>
        <Text style={[s1.choiceArrow, { color: colors.primary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLibrary} style={s1.libraryLink}>
        <Text style={s1.libraryText}>Choose from Library</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s1 = StyleSheet.create({
  container: { padding: spacing[5], gap: spacing[5] },
  card: {
    borderRadius: 24,
    backgroundColor: colors.childAccent,
    padding: spacing[6],
    overflow: 'hidden',
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.childAccentDark,
    opacity: 0.4,
    borderRadius: 24,
  },
  rpPill: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    backgroundColor: '#FFD700',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rpText: { fontSize: 13, fontWeight: '800', color: colors.childAccent },
  cardEmoji: { fontSize: 44, marginBottom: spacing[2] },
  cardTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: spacing[2] },
  cardSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  motivate: {
    textAlign: 'center',
    color: colors.childAccent,
    fontWeight: '700',
    fontSize: 14,
  },
  choiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing[4],
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  photoBtn: { borderColor: colors.childAccent },
  videoBtn: { borderColor: colors.primary },
  choiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  choiceIconText: { fontSize: 26 },
  choiceText: { flex: 1 },
  choiceTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  choiceSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  choiceArrow: { fontSize: 26, fontWeight: '700' },
  libraryLink: { alignItems: 'center', paddingVertical: spacing[2] },
  libraryText: {
    color: colors.textMuted,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

// ─── Step 2 — Camera Capture ─────────────────────────────────────────────────

function CameraCapture({ captureType, capturedAsset, onCapture, onRetake, onUse }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onCapture('camera');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onCapture]);

  if (capturedAsset) {
    return (
      <View style={s2.container}>
        <Image source={{ uri: capturedAsset.uri }} style={s2.preview} resizeMode="cover" />
        <View style={s2.previewOverlay}>
          <View style={s2.looksGood}>
            <Text style={s2.looksGoodText}>Looks good! Ready to submit?</Text>
          </View>
          <View style={s2.previewActions}>
            <TouchableOpacity style={s2.retakeBtn} onPress={onRetake}>
              <Text style={s2.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s2.useBtn} onPress={onUse}>
              <Text style={s2.useBtnText}>Use This</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s2.container}>
      {/* Viewfinder */}
      <View style={s2.viewfinder}>
        <View style={s2.dashGuide}>
          <Text style={s2.guideText}>Frame your completed task</Text>
        </View>
        {/* Status dot */}
        <View style={s2.statusRow}>
          <View style={s2.statusDot} />
          <Text style={s2.statusText}>Camera ready</Text>
        </View>
        {/* Countdown overlay */}
        {countdown !== null ? (
          <View style={s2.countdownOverlay}>
            <Text style={s2.countdownText}>{countdown}</Text>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={s2.controls}>
        <TouchableOpacity style={s2.sideBtn} onPress={() => onCapture('library')}>
          <Text style={s2.sideBtnIcon}>LIB</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s2.shutter}
          onPress={() => onCapture('camera')}
          disabled={countdown !== null}
        >
          <View style={s2.shutterInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={s2.sideBtn}
          onPress={() => setCountdown(3)}
          disabled={countdown !== null}
        >
          <Text style={s2.sideBtnIcon}>{countdown !== null ? `${countdown}` : '3s'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s2.motivate}>
        {captureType === 'video' ? 'Record up to 30 seconds' : "You're crushing it!"}
      </Text>
    </View>
  );
}

const s2 = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  viewfinder: {
    margin: spacing[5],
    borderRadius: 24,
    backgroundColor: '#1F2937',
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashGuide: {
    position: 'absolute',
    top: spacing[8],
    left: spacing[8],
    right: spacing[8],
    bottom: spacing[8],
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  statusRow: {
    position: 'absolute',
    bottom: spacing[4],
    left: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 9999,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  statusText: { color: '#FFFFFF', fontSize: 12 },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  countdownText: { fontSize: 80, fontWeight: '900', color: '#FFFFFF' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
    paddingHorizontal: spacing[6],
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnIcon: { fontSize: 24 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.childAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
  },
  motivate: {
    textAlign: 'center',
    color: colors.childAccent,
    fontWeight: '700',
    fontSize: 14,
    marginTop: spacing[5],
  },
  // Preview state
  preview: { flex: 1 },
  previewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
    gap: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  looksGood: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  looksGoodText: { color: '#4ADE80', fontWeight: '700', fontSize: 15 },
  previewActions: { flexDirection: 'row', gap: spacing[3] },
  retakeBtn: {
    flex: 1,
    paddingVertical: spacing[4],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  retakeBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  useBtn: {
    flex: 1,
    paddingVertical: spacing[4],
    borderRadius: 16,
    backgroundColor: colors.childAccent,
    alignItems: 'center',
  },
  useBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});

// ─── Step 2.5 — AI Coaching ───────────────────────────────────────────────────

function AiCoachingStep({ coaching, recommendation, onContinue, onRetake }) {
  const isGood = recommendation === 'submit';
  const panelBg = isGood ? colors.successSurface : colors.warningSurface;
  const panelBorder = isGood ? colors.success : colors.warning;
  const panelIcon = isGood ? 'OK' : 'TIP';

  return (
    <ScrollView contentContainerStyle={sCoach.container} showsVerticalScrollIndicator={false}>
      <View style={sCoach.iconWrap}>
        <Text style={sCoach.icon}>AI</Text>
      </View>
      <Text style={sCoach.title}>AI Coaching</Text>
      <Text style={sCoach.subtitle}>Here's what I noticed about your photo:</Text>

      <View style={[sCoach.panel, { backgroundColor: panelBg, borderColor: panelBorder }]}>
        <Text style={sCoach.panelIcon}>{panelIcon}</Text>
        <Text style={[sCoach.panelText, { color: isGood ? colors.success : colors.warning }]}>
          {coaching}
        </Text>
      </View>

      {isGood ? (
        <TouchableOpacity style={[sCoach.btn, sCoach.btnGreen]} onPress={onContinue} activeOpacity={0.85}>
          <Text style={sCoach.btnText}>Looks great! Continue →</Text>
        </TouchableOpacity>
      ) : (
        <View style={sCoach.twoButtons}>
          <TouchableOpacity style={[sCoach.btn, sCoach.btnAmber, { flex: 1 }]} onPress={onRetake} activeOpacity={0.85}>
            <Text style={[sCoach.btnText, { color: colors.warning }]}>Retake Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[sCoach.btn, sCoach.btnGreen, { flex: 1 }]} onPress={onContinue} activeOpacity={0.85}>
            <Text style={sCoach.btnText}>Submit Anyway →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function AiCoachingLoading() {
  return (
    <View style={sCoach.loadingWrap}>
      <Text style={sCoach.loadingIcon}>AI</Text>
      <Text style={sCoach.loadingTitle}>AI is reviewing your photo…</Text>
      <Text style={sCoach.loadingSubtitle}>Give me a moment!</Text>
    </View>
  );
}

const sCoach = StyleSheet.create({
  container: {
    padding: spacing[5],
    gap: spacing[5],
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.childSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.childAccent + '44',
  },
  icon: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  panel: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: spacing[4],
    gap: spacing[2],
    alignItems: 'flex-start',
  },
  panelIcon: { fontSize: 24 },
  panelText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  twoButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    width: '100%',
  },
  btn: {
    borderRadius: 14,
    paddingVertical: spacing[4],
    alignItems: 'center',
    width: '100%',
  },
  btnGreen: {
    backgroundColor: colors.success,
  },
  btnAmber: {
    backgroundColor: colors.warningSurface,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    padding: spacing[6],
  },
  loadingIcon: { fontSize: 52 },
  loadingTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, color: colors.textMuted },
});

// ─── Step 3 — Review & Submit ─────────────────────────────────────────────────

function ReviewSubmit({ taskTitle, taskPoints, capturedAsset, onChangePhoto, onSubmit, submitting, submitProgress }) {
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [note, setNote] = useState('');
  const insets = useSafeAreaInsets();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!submitting) return;
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    return () => spinAnim.stopAnimation();
  }, [submitting, spinAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={120}
      >
        <ScrollView contentContainerStyle={s3.container} showsVerticalScrollIndicator={false}>
          {/* Evidence preview */}
          <View style={s3.previewWrap}>
            {capturedAsset ? (
              <Image source={{ uri: capturedAsset.uri }} style={s3.previewImg} resizeMode="cover" />
            ) : (
              <View style={[s3.previewImg, s3.previewPlaceholder]}>
                <Text style={s3.previewPlaceholderText}>No image selected</Text>
              </View>
            )}
            <TouchableOpacity style={s3.changeBtn} onPress={onChangePhoto}>
              <Text style={s3.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Task recap */}
          <View style={s3.recap}>
            <View style={s3.recapRow}>
              <View style={{ flex: 1 }}>
                <Text style={s3.recapTitle}>{taskTitle}</Text>
                <View style={s3.recapRpPill}>
                  <Text style={s3.recapRpText}>+{taskPoints} RP</Text>
                </View>
              </View>
            </View>
            <Text style={s3.recapNote}>Your photo will be reviewed by AI and then your parent</Text>
          </View>

          {/* Optional note */}
          <View style={s3.noteCard}>
            <TouchableOpacity style={s3.noteToggle} onPress={() => setNoteExpanded((v) => !v)}>
              <Text style={s3.noteToggleText}>Add a note to your parent (optional)</Text>
              <Text style={s3.noteToggleIcon}>{noteExpanded ? '⌃' : '⌄'}</Text>
            </TouchableOpacity>
            {noteExpanded ? (
              <TextInput
                style={s3.noteInput}
                placeholder="E.g., I also organized my closet!"
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={200}
              />
            ) : null}
          </View>

          <Text style={s3.motivate}>Almost there!</Text>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed submit button */}
      <View style={[s3.footer, { paddingBottom: insets.bottom + spacing[3] }]}>
        <TouchableOpacity
          style={[s3.submitBtn, submitting && s3.submitBtnDisabled]}
          onPress={() => onSubmit(note)}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={s3.submitBtnText}>Submit for Review</Text>
        </TouchableOpacity>
        <Text style={s3.submitHint}>Your parent will be notified to review this</Text>
      </View>

      {/* Loading overlay */}
      {submitting ? (
        <View style={s3.overlay}>
          <View style={s3.overlayCard}>
            <Text style={s3.overlayTitle}>AI is checking your evidence…</Text>
            <Text style={s3.overlaySubtitle}>This takes about 5 seconds</Text>
            <View style={s3.progressTrack}>
              <View style={[s3.progressFill, { width: `${submitProgress}%` }]} />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

const s3 = StyleSheet.create({
  container: { padding: spacing[5], gap: spacing[4] },
  previewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface2,
  },
  previewImg: { width: '100%', height: '100%' },
  previewPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  previewPlaceholderText: { color: colors.textMuted, fontSize: 14 },
  changeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  changeBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  recap: {
    backgroundColor: colors.surface2,
    borderRadius: 20,
    padding: spacing[5],
    gap: spacing[2],
  },
  recapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  recapTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing[2] },
  recapRpPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  recapRpText: { fontSize: 12, fontWeight: '800', color: colors.childAccent },
  recapNote: { fontSize: 13, color: colors.textMuted },
  noteCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  noteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  noteToggleText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  noteToggleIcon: { fontSize: 18, color: colors.textMuted },
  noteInput: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing[4],
    fontSize: 14,
    color: colors.text,
    minHeight: 88,
  },
  motivate: {
    textAlign: 'center',
    color: colors.childAccent,
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  submitBtn: {
    backgroundColor: colors.childAccent,
    borderRadius: 9999,
    paddingVertical: spacing[4],
    alignItems: 'center',
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  submitHint: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing[2],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  overlayCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing[8],
    marginHorizontal: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    width: '85%',
  },
  overlaySparkle: { fontSize: 52 },
  overlayTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  overlaySubtitle: { fontSize: 13, color: colors.textMuted },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.childAccent,
    borderRadius: 3,
  },
});

// ─── Success state ────────────────────────────────────────────────────────────

function SuccessState({ taskPoints, onBack }) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <View style={[successStyles.container, { paddingBottom: insets.bottom + spacing[6] }]}>
      <Animated.View style={[successStyles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={successStyles.checkIcon}>✓</Text>
      </Animated.View>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', gap: spacing[4] }}>
        <Text style={successStyles.title}>Submitted!</Text>
        <Text style={successStyles.subtitle}>
          Your parent will review and approve. Check back soon!
        </Text>
        <View style={successStyles.rpPending}>
          <Text style={successStyles.rpPendingText}>+{taskPoints} RP pending</Text>
        </View>
        <TouchableOpacity style={successStyles.backBtn} onPress={onBack}>
          <Text style={successStyles.backBtnText}>Back to Tasks</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const successStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[5],
    backgroundColor: colors.surface,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  checkIcon: { fontSize: 44, color: '#FFFFFF', fontWeight: '900' },
  title: { fontSize: 32, fontWeight: '900', color: colors.text },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  rpPending: {
    backgroundColor: '#FEF3C7',
    borderRadius: 9999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  rpPendingText: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  backBtn: {
    backgroundColor: colors.childAccent,
    borderRadius: 9999,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[10],
    marginTop: spacing[2],
    shadowColor: colors.childAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EvidenceSubmitScreen() {
  const { token, refreshMe } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { taskId, taskTitle = 'Complete task', taskPoints = 10 } = route.params || {};

  const [step, setStep] = useState(1);
  const [captureType, setCaptureType] = useState('photo'); // 'photo' | 'video'
  const [capturedAsset, setCapturedAsset] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // AI coaching step state (step 2.5)
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingResult, setCoachingResult] = useState(null); // { coaching, recommendation }

  const progressRef = useRef(null);
  const coachingTimeoutRef = useRef(null);

  function goBack() {
    if (step === 1) {
      navigation.goBack();
    } else if (step === 2.5) {
      setStep(2);
      setCoachingResult(null);
      setCoachingLoading(false);
      clearTimeout(coachingTimeoutRef.current);
    } else if (step === 2) {
      setCapturedAsset(null);
      setStep(1);
    } else if (step === 3) {
      // Go back to coaching step if we have a result, otherwise back to capture
      setStep(2.5);
    } else {
      setStep((s) => s - 1);
    }
  }

  // ── Step 1 handlers ──────────────────────────────────────────────────────

  function handlePhoto() {
    setCaptureType('photo');
    setStep(2);
  }

  function handleVideo() {
    setCaptureType('video');
    setStep(2);
  }

  async function handleLibrary() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Allow access to your photo library to pick evidence.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
      });
      if (result.canceled) return;
      setCapturedAsset(result.assets[0]);
      setStep(3);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────

  const handleCapture = useCallback(async (source) => {
    try {
      if (source !== 'library' && captureType === 'photo' && (await isDemoMode())) {
        setCapturedAsset({ uri: 'demo://evidence', mimeType: 'image/png', demo: true });
        return;
      }
      if (source === 'library') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Allow access to your photo library.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.8,
        });
        if (result.canceled) return;
        setCapturedAsset(result.assets[0]);
      } else {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission required', 'Allow camera access to take photos.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: captureType === 'video' ? ['videos'] : ['images'],
          quality: 0.8,
          videoMaxDuration: 30,
        });
        if (result.canceled) return;
        setCapturedAsset(result.assets[0]);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [captureType]);

  function handleRetake() {
    setCapturedAsset(null);
    setCoachingResult(null);
  }

  async function handleUsePhoto() {
    if (capturedAsset?.demo) {
      setCoachingResult(null);
      setCoachingLoading(false);
      setStep(3);
      return;
    }
    // Transition to AI coaching step
    setCoachingResult(null);
    setCoachingLoading(true);
    setStep(2.5);

    // 5-second timeout — skip coaching if API takes too long
    coachingTimeoutRef.current = setTimeout(() => {
      setCoachingLoading(false);
      setStep(3);
    }, 5000);

    try {
      const mime = capturedAsset?.mimeType || (captureType === 'video' ? 'video/mp4' : 'image/jpeg');
      const base64 = await FileSystem.readAsStringAsync(capturedAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await apiRequest('/ai/evidence-preview', {
        method: 'POST',
        token,
        body: {
          taskId,
          evidenceData: `data:${mime};base64,${base64}`,
          evidenceMime: mime,
        },
      });
      clearTimeout(coachingTimeoutRef.current);
      setCoachingResult({ coaching: result.coaching, recommendation: result.recommendation });
      setCoachingLoading(false);
    } catch {
      // On error, skip coaching and go straight to review
      clearTimeout(coachingTimeoutRef.current);
      setCoachingLoading(false);
      setStep(3);
    }
  }

  function handleCoachingContinue() {
    setCoachingResult(null);
    setStep(3);
  }

  function handleCoachingRetake() {
    setCapturedAsset(null);
    setCoachingResult(null);
    setStep(2);
  }

  // ── Step 3 handlers ──────────────────────────────────────────────────────

  async function handleSubmit(note) {
    if (!capturedAsset) {
      Alert.alert('No evidence', 'Please take a photo or video first.');
      setStep(2);
      return;
    }
    setSubmitting(true);
    setSubmitProgress(0);

    // Animate progress bar over 5 seconds
    let pct = 0;
    progressRef.current = setInterval(() => {
      pct += 2;
      setSubmitProgress(Math.min(pct, 95));
      if (pct >= 95) clearInterval(progressRef.current);
    }, 100);

    try {
      let mime;
      let base64;
      if (capturedAsset?.demo) {
        mime = 'image/png';
        base64 = DEMO_PNG_BASE64;
      } else {
        mime = capturedAsset.mimeType || (captureType === 'video' ? 'video/mp4' : 'image/jpeg');
        base64 = await FileSystem.readAsStringAsync(capturedAsset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      const evidenceType = mime.startsWith('video/') ? 'Video' : 'Photo';

      await apiRequest('/tasks/complete', {
        method: 'POST',
        token,
        body: {
          taskId,
          evidenceData: `data:${mime};base64,${base64}`,
          evidenceMime: mime,
          evidenceType,
          evidenceNote: note || null,
        },
      });

      clearInterval(progressRef.current);
      setSubmitProgress(100);
      setTimeout(async () => {
        setSubmitting(false);
        setSuccess(true);
        await refreshMe();
      }, 400);
    } catch (e) {
      clearInterval(progressRef.current);
      setSubmitting(false);
      setError(getErrorMessage(e));
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (success) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <SuccessState taskPoints={taskPoints} onBack={() => navigation.goBack()} />
      </View>
    );
  }

  const stepTitles = {
    1: 'Submit Proof',
    2: captureType === 'video' ? 'Record a Video' : 'Take a Photo',
    2.5: 'AI Coaching',
    3: 'Review & Submit',
  };
  const stepForDots = step === 2.5 ? 2 : step;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StepHeader title={stepTitles[step] || 'Submit Proof'} step={stepForDots} onBack={goBack} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Text style={styles.errorDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        {step === 1 && (
          <TaskOverview
            taskTitle={taskTitle}
            taskPoints={taskPoints}
            onPhoto={handlePhoto}
            onVideo={handleVideo}
            onLibrary={handleLibrary}
          />
        )}
        {step === 2 && (
          <CameraCapture
            captureType={captureType}
            capturedAsset={capturedAsset}
            onCapture={handleCapture}
            onRetake={handleRetake}
            onUse={handleUsePhoto}
          />
        )}
        {step === 2.5 && (
          coachingLoading ? (
            <AiCoachingLoading />
          ) : coachingResult ? (
            <AiCoachingStep
              coaching={coachingResult.coaching}
              recommendation={coachingResult.recommendation}
              onContinue={handleCoachingContinue}
              onRetake={handleCoachingRetake}
            />
          ) : null
        )}
        {step === 3 && (
          <ReviewSubmit
            taskTitle={taskTitle}
            taskPoints={taskPoints}
            capturedAsset={capturedAsset}
            onChangePhoto={() => setStep(2)}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitProgress={submitProgress}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.errorSurface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[3],
  },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },
  errorDismiss: { color: colors.danger, fontSize: 16, fontWeight: '700' },
});
