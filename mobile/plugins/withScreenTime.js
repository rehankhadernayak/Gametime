/**
 * Expo config plugin: Apple Family Controls (Screen Time API) for iOS.
 * Merges the Family Controls entitlement and NSFamilyControlsUsageDescription into the native project.
 */
const {
  createRunOncePlugin,
  withEntitlementsPlist,
  withInfoPlist,
} = require('@expo/config-plugins');

const PLUGIN_NAME = 'with-screen-time-family-controls';
const PLUGIN_VERSION = '1.0.0';

const FAMILY_CONTROLS_ENTITLEMENT = 'com.apple.developer.family-controls';

const NS_FAMILY_CONTROLS_USAGE_DESCRIPTION = 'NSFamilyControlsUsageDescription';
const NS_FAMILY_CONTROLS_USAGE_DESCRIPTION_VALUE =
  'Gametime requires Family Controls to strictly enforce gaming limits and block apps when the operational timer expires.';

/** @param {import('@expo/config-plugins').ExpoConfig} config */
function withScreenTimeInternal(config) {
  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults[FAMILY_CONTROLS_ENTITLEMENT] = true;
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults[NS_FAMILY_CONTROLS_USAGE_DESCRIPTION] =
      NS_FAMILY_CONTROLS_USAGE_DESCRIPTION_VALUE;
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withScreenTimeInternal,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
