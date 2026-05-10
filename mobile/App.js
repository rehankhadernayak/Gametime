import { StatusBar } from 'expo-status-bar';
import { useFonts, IBMPlexMono_400Regular, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import GametimeRootErrorBoundary from './src/components/GametimeRootErrorBoundary';
import { navigationRef } from './src/navigation/navigationRef';
import { colors } from './src/theme/colors';

// ─── Foreground notification display ──────────────────────────────────────────
// By default Expo suppresses notifications while the app is in the foreground.
// This handler makes them appear as banners even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

// ─── Navigation theme ─────────────────────────────────────────────────────────
const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border
  }
};

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_700Bold
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={appTheme} ref={navigationRef}>
          <StatusBar style="dark" />
          <GametimeRootErrorBoundary>
            <RootNavigator />
          </GametimeRootErrorBoundary>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
