// SPDX-License-Identifier: Apache-2.0
//
// withCleanUpdatesManifest - strip every expo-updates / OTA reference from the
// generated native projects during `expo prebuild`.
//
// WHY THIS EXISTS
// ---------------
// JouwPrivacy is a privacy-first app and ships NO over-the-air updates: we
// removed `expo-updates` entirely so the app never fetches or executes code
// from a remote source after install (a requirement for F-Droid / Neo Store,
// and a privacy guarantee we make to users - what you build is what runs).
//
// Even with `expo-updates` uninstalled, Expo's BASE AndroidManifest template
// still emits a couple of inert `expo.modules.updates.*` <meta-data> entries
// (e.g. EXPO_UPDATES_CHECK_ON_LAUNCH, EXPO_UPDATES_LAUNCH_WAIT_MS). They do
// nothing without the native module, but a manifest that *mentions* OTA reads
// as "OTA is configured". Since `android/` and `ios/` are gitignored and
// regenerated on every contributor's prebuild, this plugin is what guarantees
// a genuinely clean manifest for everyone - not "present but inert".
//
// It uses the official @expo/config-plugins mod helpers (never hand-edits the
// generated files) so it stays correct across Expo SDK upgrades.

const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withExpoPlist,
  withInfoPlist,
} = require('@expo/config-plugins');

const ANDROID_UPDATES_PREFIX = 'expo.modules.updates';

// expo-updates configures iOS through EXUpdates* keys. These land in
// Supporting/Expo.plist (and, defensively, could appear in Info.plist).
const IOS_UPDATES_KEY_PREFIX = 'EXUpdates';

/**
 * Remove all <meta-data android:name="expo.modules.updates.*"> entries from the
 * application node of the generated AndroidManifest.xml.
 */
function withCleanAndroidUpdates(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application && Array.isArray(application['meta-data'])) {
      application['meta-data'] = application['meta-data'].filter((entry) => {
        const name = entry?.$?.['android:name'] ?? '';
        return !name.startsWith(ANDROID_UPDATES_PREFIX);
      });
    }
    return cfg;
  });
}

/** Delete every EXUpdates* key from a parsed plist object (mutates in place). */
function stripUpdatesKeys(plist) {
  for (const key of Object.keys(plist)) {
    if (key.startsWith(IOS_UPDATES_KEY_PREFIX)) {
      delete plist[key];
    }
  }
}

/**
 * Remove any EXUpdates* keys from the generated iOS plists. The real keys live
 * in Supporting/Expo.plist; Info.plist is cleaned defensively too.
 */
function withCleanIosUpdates(config) {
  let cfg = withExpoPlist(config, (c) => {
    stripUpdatesKeys(c.modResults);
    return c;
  });
  cfg = withInfoPlist(cfg, (c) => {
    stripUpdatesKeys(c.modResults);
    return c;
  });
  return cfg;
}

/**
 * Strip EXUpdates resource-bundle references from the generated Xcode project.
 *
 * Expo's base iOS template hardcodes an `EXUpdates.bundle` entry in the
 * "[CP] Copy Pods Resources" build phase input/output lists, even when
 * expo-updates is not a dependency. `pod install` normally reconciles this
 * away, but we remove it during prebuild so the committed-free, regenerated
 * project never references OTA at all. Each match is a standalone array line,
 * so dropping the whole line keeps the pbxproj valid.
 */
function withCleanIosXcodeProject(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const xcodeproj = fs.readdirSync(iosRoot).find((name) => name.endsWith('.xcodeproj'));
      if (!xcodeproj) return cfg;

      const pbxPath = path.join(iosRoot, xcodeproj, 'project.pbxproj');
      const lines = fs.readFileSync(pbxPath, 'utf8').split('\n');
      const cleaned = lines.filter((line) => !line.includes('EXUpdates'));
      if (cleaned.length !== lines.length) {
        fs.writeFileSync(pbxPath, cleaned.join('\n'));
      }
      return cfg;
    },
  ]);
}

/**
 * Config plugin entry point: strip OTA/updates references from both platforms.
 */
module.exports = function withCleanUpdatesManifest(config) {
  return withCleanIosXcodeProject(withCleanIosUpdates(withCleanAndroidUpdates(config)));
};
