import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import HeaderNotifications from '../components/HeaderNotifications';

import WelcomeScreen from '../screens/WelcomeScreen';
import ParentLoginScreen from '../screens/ParentLoginScreen';
import ParentSignupScreen from '../screens/ParentSignupScreen';
import ChildLoginScreen from '../screens/ChildLoginScreen';
import LinkFamilyScreen from '../screens/auth/LinkFamilyScreen';
import ApiSettingsScreen from '../screens/ApiSettingsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';

import ParentHomeScreen from '../screens/parent/ParentHomeScreen';
import ParentChildrenScreen from '../screens/parent/ParentChildrenScreen';
import ParentTasksScreen from '../screens/parent/ParentTasksScreen';
import ParentApprovalsScreen from '../screens/parent/ParentApprovalsScreen';
import ParentRewardsScreen from '../screens/parent/ParentRewardsScreen';
import ParentGamingScreen from '../screens/parent/ParentGamingScreen';
import ParentAiScreen from '../screens/parent/ParentAiScreen';
import ParentMobileKinetic from '../screens/ParentMobileKinetic';
import AccountScreen from '../screens/AccountScreen';

import ChildHome from '../screens/child/ChildHome';
import ChildTasksScreen from '../screens/child/ChildTasksScreen';
import ChildRewardsScreen from '../screens/child/ChildRewardsScreen';
import ChildRewardsStore from '../screens/child/ChildRewardsStore';
import ChildGamingScreen from '../screens/child/ChildGamingScreen';
import ChildAiScreen from '../screens/child/ChildAiScreen';
import ChildNotificationsScreen from '../screens/child/ChildNotificationsScreen';
import EvidenceSubmitScreen from '../screens/child/EvidenceSubmitScreen';
import TaskProofScreen from '../screens/child/TaskProofScreen';
import ChildSession from '../screens/child/ChildSession';

import ParentNotificationsScreen from '../screens/parent/ParentNotificationsScreen';
import ParentChildDetailScreen from '../screens/parent/ParentChildDetailScreen';
import OneBitAsciiHeader from '../components/ui/OneBitAsciiHeader';
import { ONE_BIT } from '../components/ui/oneBitTheme';

/** Child reward store header — matches ChildDashboard Time Bank cream theme */
const TIME_BANK_CREAM = '#F9F9F4';
const TEXT_DARK_CHILD_NAV = '#1A1A1E';

// Navigators
const AuthStackNav = createNativeStackNavigator();
const ParentStackNav = createNativeStackNavigator();
const ParentTabNav   = createBottomTabNavigator();
const ChildStackNav  = createNativeStackNavigator();
const ChildTabNav    = createBottomTabNavigator();

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.loadingText}>Loading Gametime…</Text>
    </View>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthStack({ childMustLinkFamily }) {
  return (
    <AuthStackNav.Navigator
      key={childMustLinkFamily ? 'auth-link-family' : 'auth-default'}
      initialRouteName={childMustLinkFamily ? 'LinkFamily' : 'Welcome'}
    >
      <AuthStackNav.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStackNav.Screen name="ParentLogin" component={ParentLoginScreen} options={{ title: 'Parent Login' }} />
      <AuthStackNav.Screen
        name="ParentSignup"
        component={ParentSignupScreen}
        options={{ headerShown: false, title: 'Create Account' }}
      />
      <AuthStackNav.Screen name="ChildLogin" component={ChildLoginScreen} options={{ title: 'Child Login' }} />
      <AuthStackNav.Screen name="LinkFamily" component={LinkFamilyScreen} options={{ headerShown: false, title: 'Join family' }} />
      <AuthStackNav.Screen name="ApiSettings" component={ApiSettingsScreen} options={{ title: 'Connection Settings' }} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
      <AuthStackNav.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ title: 'Set New Password' }} />
    </AuthStackNav.Navigator>
  );
}

// ─── Parent bottom tabs (AI is tab 1 — the primary surface) ──────────────────

const PARENT_TABS = [
  { name: 'ParentAiTab',       component: ParentAiScreen,       label: 'AI',       icon: 'sparkles' },
  { name: 'ParentApprovals',   component: ParentApprovalsScreen, label: 'Approvals', icon: 'checkmark-circle' },
  { name: 'ParentTasks',       component: ParentTasksScreen,    label: 'Tasks',    icon: 'list' },
  { name: 'ParentChildren',    component: ParentChildrenScreen, label: 'Family',   icon: 'people' },
];

function ParentTabs() {
  const insets = useSafeAreaInsets();
  return (
    <ParentTabNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
        tabBarIcon: ({ focused, color }) => {
          const tab = PARENT_TABS.find((t) => t.name === route.name);
          const iconName = focused ? tab.icon : `${tab.icon}-outline`;
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      {PARENT_TABS.map((tab) => (
        <ParentTabNav.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </ParentTabNav.Navigator>
  );
}

/**
 * ParentStack — wraps ParentTabs in a native stack so full-screen pushes
 * (notifications, account, gaming, rewards) work without a tab bar.
 */
function ParentStack() {
  return (
    <ParentStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ParentStackNav.Screen name="ParentTabs" component={ParentTabs} />

      <ParentStackNav.Screen
        name="ParentHome"
        component={ParentHomeScreen}
        options={{ headerShown: false, title: 'Dashboard' }}
      />
      <ParentStackNav.Screen
        name="ParentChildDetail"
        component={ParentChildDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          headerTitle: () => (
            <OneBitAsciiHeader compact title={route.params?.childName || 'CHILD'} />
          ),
          headerStyle: { backgroundColor: ONE_BIT.background },
          headerTintColor: ONE_BIT.ink,
          headerShadowVisible: false
        })}
      />
      <ParentStackNav.Screen
        name="ParentGaming"
        component={ParentGamingScreen}
        options={{ headerShown: true, title: 'Gaming Controls', headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' }, headerTintColor: colors.primaryDark }}
      />
      <ParentStackNav.Screen
        name="ParentRewards"
        component={ParentRewardsScreen}
        options={{ headerShown: true, title: 'Rewards & Points', headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' }, headerTintColor: colors.primaryDark }}
      />
      <ParentStackNav.Screen
        name="ParentNotifications"
        component={ParentNotificationsScreen}
        options={{ headerShown: true, title: 'Notifications', headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' }, headerTintColor: colors.primaryDark }}
      />
      <ParentStackNav.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: true,
          title: '/// SETTINGS ///',
          headerStyle: {
            backgroundColor: ONE_BIT.background,
            borderBottomWidth: ONE_BIT.borderWidth,
            borderBottomColor: ONE_BIT.ink,
          },
          headerTitleStyle: {
            color: ONE_BIT.ink,
            fontFamily: ONE_BIT.fontBold,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
          headerTintColor: ONE_BIT.ink,
          headerShadowVisible: false,
        }}
      />
      <ParentStackNav.Screen
        name="ParentMobileKinetic"
        component={ParentMobileKinetic}
        options={{ headerShown: true, title: 'Kinetic Dashboard', headerStyle: { backgroundColor: colors.surface }, headerTitleStyle: { color: colors.text, fontWeight: '700' }, headerTintColor: colors.primaryDark }}
      />
    </ParentStackNav.Navigator>
  );
}

// ─── Child bottom tabs ────────────────────────────────────────────────────────

const CHILD_TABS = [
  { name: 'ChildHome',    component: ChildHome,    label: 'Home',    icon: 'home' },
  { name: 'ChildTasks',   component: ChildTasksScreen,   label: 'Tasks',   icon: 'checkbox' },
  { name: 'ChildGaming',  component: ChildGamingScreen,  label: 'Gaming',  icon: 'game-controller' },
  { name: 'ChildRewards', component: ChildRewardsScreen, label: 'Rewards', icon: 'gift' },
];

function ChildTabs() {
  const insets = useSafeAreaInsets();
  return (
    <ChildTabNav.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.childAccent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
        tabBarIcon: ({ focused, color }) => {
          const tab = CHILD_TABS.find((t) => t.name === route.name);
          return (
            <Ionicons
              name={focused ? tab.icon : `${tab.icon}-outline`}
              size={22}
              color={color}
            />
          );
        },
      })}
    >
      {CHILD_TABS.map((tab) => (
        <ChildTabNav.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ tabBarLabel: tab.label }}
        />
      ))}
    </ChildTabNav.Navigator>
  );
}

/**
 * ChildStack — wraps ChildTabs in a native stack so ChildAiScreen,
 * ChildNotificationsScreen, and AccountScreen can be pushed full-screen.
 */
function ChildStack() {
  return (
    <ChildStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ChildStackNav.Screen name="ChildTabs" component={ChildTabs} />

      <ChildStackNav.Screen
        name="ChildAi"
        component={ChildAiScreen}
        options={{
          headerShown: true,
          title: 'Study Buddy',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerTintColor: colors.childAccentDark,
          presentation: 'card',
        }}
      />
      <ChildStackNav.Screen
        name="ChildNotifications"
        component={ChildNotificationsScreen}
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerTintColor: colors.childAccentDark,
        }}
      />
      <ChildStackNav.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: true,
          title: '/// SETTINGS ///',
          headerStyle: {
            backgroundColor: ONE_BIT.background,
            borderBottomWidth: ONE_BIT.borderWidth,
            borderBottomColor: ONE_BIT.ink,
          },
          headerTitleStyle: {
            color: ONE_BIT.ink,
            fontFamily: ONE_BIT.fontBold,
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
          },
          headerTintColor: ONE_BIT.ink,
          headerShadowVisible: false,
        }}
      />
      <ChildStackNav.Screen
        name="EvidenceSubmit"
        component={EvidenceSubmitScreen}
        options={{ headerShown: false }}
      />
      <ChildStackNav.Screen
        name="TaskProof"
        component={TaskProofScreen}
        options={{ headerShown: false }}
      />
      <ChildStackNav.Screen
        name="ChildRewardsStore"
        component={ChildRewardsStore}
        options={{
          headerShown: true,
          title: 'Reward store',
          headerStyle: { backgroundColor: TIME_BANK_CREAM },
          headerTitleStyle: { color: TEXT_DARK_CHILD_NAV, fontWeight: '800' },
          headerTintColor: colors.primaryDark,
          headerShadowVisible: false,
        }}
      />
      <ChildStackNav.Screen
        name="ChildSession"
        component={ChildSession}
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000000' },
          presentation: 'fullScreenModal',
        }}
      />
    </ChildStackNav.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function RootNavigator() {
  const { booting, role, forceChildFamilyLink } = useAuth();

  if (booting) return <LoadingScreen />;
  if (role === 'parent') return <ParentStack />;
  if (role === 'child' && !forceChildFamilyLink) return <ChildStack />;
  return <AuthStack childMustLinkFamily={role === 'child' && forceChildFamilyLink} />;
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
