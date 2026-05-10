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

/**
 * Ensures iOS is configured for Apple Family Controls (Screen Time API):
 * entitlement + NSFamilyControlsUsageDescription for App Store / system prompts.
 *
 * @param {import('@expo/config-plugins').ExportedConfig} config
 * @returns {import('@expo/config-plugins').ExportedConfig}
 */
function withScreenTimeInternal(config) {
  config = withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    if (entitlements && entitlements[FAMILY_CONTROLS_ENTITLEMENT] !== true) {
      entitlements[FAMILY_CONTROLS_ENTITLEMENT] = true;
    }
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    const info = mod.modResults;
    if (info) {
      info[NS_FAMILY_CONTROLS_USAGE_DESCRIPTION] =
        NS_FAMILY_CONTROLS_USAGE_DESCRIPTION_VALUE;
    }
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withScreenTimeInternal,
  PLUGIN_NAME,
  PLUGIN_VERSION,
);
