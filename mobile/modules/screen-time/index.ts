import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface GametimeScreenTimeNative {
  requestAuthorization(): Promise<void>;
}

export async function requestAuthorization(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('requestAuthorization is only available on iOS');
  }

  const native = requireOptionalNativeModule<GametimeScreenTimeNative>('GametimeScreenTime');
  if (!native) {
    throw new Error(
      'GametimeScreenTime native module is not linked. Run a native iOS build (e.g. npx expo run:ios) after installing this package.'
    );
  }

  await native.requestAuthorization();
}
