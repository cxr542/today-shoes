const fs = require('node:fs/promises');
const path = require('node:path');
const { withAppDelegate, withInfoPlist, withXcodeProject, withPodfile, IOSConfig } = require('expo/config-plugins');

const SCENE_MARKER = '// oneulmwosinji: scene-owned window';
const POD_MARKER = '# oneulmwosinji: Xcode 27 minimum deployment target';

function patchAppDelegate(source) {
  if (source.includes(SCENE_MARKER)) return source;
  const startup = /#if os\(iOS\) \|\| os\(tvOS\)\s+window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif/;
  const factory = '  var reactNativeFactory: RCTReactNativeFactory?';
  if (!startup.test(source) || !source.includes(factory)) {
    throw new Error('Unsupported AppDelegate template. Review the SDK 54 scene plugin before changing Expo SDK.');
  }
  return source.replace(factory, `${factory}\n  var initialLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?`)
    .replace(startup, `${SCENE_MARKER}\n    initialLaunchOptions = launchOptions`);
}

function patchPodfile(source) {
  if (source.includes(POD_MARKER)) return source;
  const anchor = '      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )';
  if (!source.includes(anchor)) throw new Error('Unsupported Podfile template. Review minimum deployment targets.');
  return source.replace(anchor, `${anchor}
    ${POD_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] || '15.1'
        if Gem::Version.new(current) < Gem::Version.new('15.1')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end`);
}

function withOneulScene(config) {
  config = withInfoPlist(config, mod => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [{
          UISceneConfigurationName: 'Default Configuration',
          UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
        }],
      },
    };
    return mod;
  });
  config = withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('Oneul scene support requires the SDK 54 Swift AppDelegate.');
    mod.modResults.contents = patchAppDelegate(mod.modResults.contents);
    return mod;
  });
  config = withPodfile(config, mod => {
    mod.modResults.contents = patchPodfile(mod.modResults.contents);
    return mod;
  });
  return withXcodeProject(config, async mod => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(mod.modRequest.projectRoot);
    const filepath = `${projectName}/SceneDelegate.swift`;
    const source = path.join(mod.modRequest.projectRoot, 'native/ios/SceneDelegate.swift');
    await fs.copyFile(source, path.join(mod.modRequest.platformProjectRoot, filepath));
    mod.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath, groupName: projectName, project: mod.modResults,
    });
    return mod;
  });
}

module.exports = withOneulScene;
module.exports.patchAppDelegate = patchAppDelegate;
module.exports.patchPodfile = patchPodfile;
