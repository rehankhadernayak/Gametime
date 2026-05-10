const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const NS_FAMILY_CONTROLS_USAGE_DESCRIPTION =
  'Gametime requires Family Controls to strictly enforce gaming limits and block apps when the operational timer expires.';

/**
 * Ensures iOS is configured for Apple Family Controls (Screen Time API):
 * entitlement + NSFamilyControlsUsageDescription for App Store / system prompts.
 *
 * @param {import('@expo/config-plugins').ExportedConfig} config
 * @returns {import('@expo/config-plugins').ExportedConfig}
 */
function withScreenTime(config) {
  config = withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    if (entitlements && entitlements['com.apple.developer.family-controls'] !== true) {
      entitlements['com.apple.developer.family-controls'] = true;
    }
    return config;
  });

  config = withInfoPlist(config, (config) => {
    const info = config.modResults;
    if (info) {
      info.NSFamilyControlsUsageDescription = NS_FAMILY_CONTROLS_USAGE_DESCRIPTION;
    }
    return config;
  });

  return config;
}

module.exports = withScreenTime;
