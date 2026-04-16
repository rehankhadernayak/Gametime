import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const FEATURES = [
  { icon: '', label: 'Complete tasks', sub: 'Earn Reward Points (RP)' },
  { icon: '', label: 'Convert to gaming time', sub: 'RP → playable minutes' },
  { icon: '', label: 'Redeem gift cards', sub: 'Roblox, Steam & more' },
  { icon: '', label: 'AI reviews evidence', sub: 'Photo & video proof' },
];

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Full-height gradient hero */}
      <LinearGradient
        colors={['#3B5BDB', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 40 }]}
      >
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Text style={styles.logoEmoji}>GT</Text>
            </View>
          </View>
        </View>

        <Text style={styles.appName}>Gametime</Text>
        <Text style={styles.tagline}>
          Good habits unlock great rewards.{'\n'}Built for families in Singapore.
        </Text>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {['Tasks → RP', 'RP → Gaming', 'GP → Gift Cards'].map((p) => (
            <View key={p} style={styles.pill}>
              <Text style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        {/* Feature list */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('ParentLogin')} activeOpacity={0.88}>
            <Text style={styles.primaryBtnText}>Parent Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('ParentSignup')} activeOpacity={0.88}>
            <Text style={styles.secondaryBtnText}>Create Parent Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('ChildLogin')} activeOpacity={0.88}>
            <Text style={styles.outlineBtnText}>I'm a Child →</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.settingsLink} onPress={() => navigation.navigate('ApiSettings')}>
          Connection settings
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Hero gradient section
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  logoWrap: { marginBottom: 4 },
  logoOuter: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  logoInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 38 },
  appName: {
    fontSize: 46,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Bottom sheet
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },

  // Features
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  featureIcon: { fontSize: 20 },
  featureLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  featureSub: { color: colors.textMuted, fontSize: 12, marginTop: 1 },

  // Actions
  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: colors.primarySurface,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.childAccent,
    backgroundColor: colors.childAccentLight,
  },
  outlineBtnText: { color: colors.childAccent, fontSize: 15, fontWeight: '700' },

  settingsLink: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    paddingVertical: 4,
    textDecorationLine: 'underline',
  },
});
