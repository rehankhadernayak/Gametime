import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <View style={styles.logoOuter}>
            <Image
              source={require('../../assets/gametime-app-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
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
      </View>

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
          <TouchableOpacity
            testID="welcome-parent-login"
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ParentLogin')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Parent Login</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('ParentSignup')} activeOpacity={0.88}>
            <Text style={styles.secondaryBtnText}>Create Parent Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="welcome-child-login"
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('ChildLogin')}
            activeOpacity={0.88}
          >
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
    backgroundColor: colors.bgRoot,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  logoWrap: { marginBottom: 4 },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  logoImage: {
    width: 72,
    height: 72,
    tintColor: '#000000',
  },
  appName: {
    fontSize: 46,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -1.5,
  },
  tagline: {
    color: '#404040',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  pillsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: '#000000',
  },
  pillText: { color: '#000000', fontSize: 12, fontWeight: '700' },

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
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  secondaryBtnText: { color: colors.primaryDark, fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    borderRadius: 0,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#F5F5F5',
  },
  outlineBtnText: { color: '#000000', fontSize: 15, fontWeight: '700' },

  settingsLink: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    paddingVertical: 4,
    textDecorationLine: 'underline',
  },
});
