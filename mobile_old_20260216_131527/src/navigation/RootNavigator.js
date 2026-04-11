import { ActivityIndicator, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from '../screens/WelcomeScreen';
import ParentLoginScreen from '../screens/ParentLoginScreen';
import ParentSignupScreen from '../screens/ParentSignupScreen';
import ChildLoginScreen from '../screens/ChildLoginScreen';
import ParentHomeScreen from '../screens/ParentHomeScreen';
import ParentChildrenScreen from '../screens/ParentChildrenScreen';
import ParentTasksScreen from '../screens/ParentTasksScreen';
import ParentRewardsScreen from '../screens/ParentRewardsScreen';
import ParentApprovalsScreen from '../screens/ParentApprovalsScreen';
import ChildHomeScreen from '../screens/ChildHomeScreen';
import ChildTasksScreen from '../screens/ChildTasksScreen';
import ChildRewardsScreen from '../screens/ChildRewardsScreen';
import AccountScreen from '../screens/AccountScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function BootScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} />
      <Text>Loading SideQuest...</Text>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ParentLogin" component={ParentLoginScreen} options={{ title: 'Parent Login' }} />
      <Stack.Screen name="ParentSignup" component={ParentSignupScreen} options={{ title: 'Parent Sign Up' }} />
      <Stack.Screen name="ChildLogin" component={ChildLoginScreen} options={{ title: 'Child Login' }} />
    </Stack.Navigator>
  );
}

function ParentTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ParentHome" component={ParentHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ParentChildren" component={ParentChildrenScreen} options={{ title: 'Children' }} />
      <Tab.Screen name="ParentTasks" component={ParentTasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="ParentApprovals" component={ParentApprovalsScreen} options={{ title: 'Approvals' }} />
      <Tab.Screen name="ParentRewards" component={ParentRewardsScreen} options={{ title: 'Rewards' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

function ChildTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="ChildHome" component={ChildHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="ChildTasks" component={ChildTasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="ChildRewards" component={ChildRewardsScreen} options={{ title: 'Rewards' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { booting, role } = useAuth();

  if (booting) return <BootScreen />;
  if (role === 'parent') return <ParentTabs />;
  if (role === 'child') return <ChildTabs />;
  return <AuthStack />;
}
