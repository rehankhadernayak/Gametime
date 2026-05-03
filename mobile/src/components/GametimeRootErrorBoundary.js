import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../theme/colors';

/**
 * Catches render errors from the navigator tree (e.g. Supabase client throws while offline).
 * Shows a calm recovery screen instead of a blank crash.
 */
export default class GametimeRootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, retrying: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[GametimeRootErrorBoundary]', error?.message, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ retrying: true, error: null });
    requestAnimationFrame(() => {
      this.setState({ retrying: false });
    });
  };

  render() {
    const { error, retrying } = this.state;
    const { children } = this.props;

    if (error && !retrying) {
      return (
        <View style={styles.wrap} accessibilityRole="alert">
          <Image
            accessibilityLabel="Gametime"
            source={require('../../assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Searching for Signal…</Text>
          <Text style={styles.body}>
            {"We couldn't reach Gametime right now. Check your connection and try again."}
          </Text>
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.btnText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (retrying) {
      return (
        <View style={styles.wrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
    gap: 16,
  },
  logo: { width: 88, height: 88, marginBottom: 8 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  btn: {
    marginTop: 8,
    minHeight: 48,
    minWidth: 200,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.88 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
