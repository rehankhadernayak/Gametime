import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Singleton navigation ref shared between NavigationContainer (App.js)
 * and usePushNotifications so notification taps can trigger deep-links
 * without needing to prop-drill through the component tree.
 */
export const navigationRef = createNavigationContainerRef();
