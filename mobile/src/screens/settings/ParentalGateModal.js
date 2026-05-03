import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';

function randomAddends() {
  const a = 10 + Math.floor(Math.random() * 40);
  const b = 10 + Math.floor(Math.random() * 40);
  return { a, b, sum: a + b };
}

/**
 * Simple math gate so young children are less likely to trigger sensitive actions by accident.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {() => void} props.onClose
 * @param {() => void} props.onVerified — called when the answer is correct
 */
export default function ParentalGateModal({ visible, title, message, onClose, onVerified }) {
  const [puzzle, setPuzzle] = useState(() => randomAddends());
  const [answer, setAnswer] = useState('');
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (visible) {
      setPuzzle(randomAddends());
      setAnswer('');
      setWrong(false);
    }
  }, [visible]);

  const submit = useCallback(() => {
    const n = parseInt(answer.trim(), 10);
    if (Number.isFinite(n) && n === puzzle.sum) {
      onVerified();
      onClose();
      return;
    }
    setWrong(true);
  }, [answer, onClose, onVerified, puzzle]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <Text style={styles.prompt}>
            Ask a parent: what is {puzzle.a} + {puzzle.b}?
          </Text>
          <TextInput
            value={answer}
            onChangeText={(t) => {
              setAnswer(t.replace(/[^\d-]/g, ''));
              if (wrong) setWrong(false);
            }}
            keyboardType="number-pad"
            placeholder="Answer"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, wrong && styles.inputError]}
            returnKeyType="done"
            onSubmitEditing={submit}
            accessibilityLabel="Math answer"
          />
          {wrong ? <Text style={styles.wrongHint}>Not quite — try again or ask a parent.</Text> : null}
          <View style={styles.row}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.btnPrimaryText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  message: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  prompt: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputError: { borderColor: colors.danger },
  wrongHint: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnSecondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
  btnSecondaryText: { fontSize: 15, fontWeight: '800', color: colors.text },
  btnPrimaryText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
