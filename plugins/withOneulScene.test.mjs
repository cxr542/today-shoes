import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import plugin from './withOneulScene.js';

test('moves native window ownership out of the SDK54 launch delegate', () => {
  const source = `  var reactNativeFactory: RCTReactNativeFactory?\n#if os(iOS) || os(tvOS)\n    window = UIWindow(frame: UIScreen.main.bounds)\n    factory.startReactNative(withModuleName: "main", in: window)\n#endif\n  return super.application(application, didFinishLaunchingWithOptions: launchOptions)`;
  const actual = plugin.patchAppDelegate(source);
  assert.equal(actual.includes('window = UIWindow(frame:'), false);
  assert.equal(actual.includes('initialLaunchOptions = launchOptions'), true);
  assert.equal(actual.includes('super.application'), true);
  assert.equal(plugin.patchAppDelegate(actual), actual);
});
test('unsupported future native templates fail instead of silently losing startup', () => {
  assert.throws(() => plugin.patchAppDelegate('class AppDelegate {}'), /Unsupported/);
});
test('pod targets keep higher OS requirements and are raised to 15.1 when lower', () => {
  const source = '      :ccache_enabled => ccache_enabled?(podfile_properties),\n    )';
  const actual = plugin.patchPodfile(source);
  assert.equal(actual.includes("Gem::Version.new(current) < Gem::Version.new('15.1')"), true);
  assert.equal(plugin.patchPodfile(actual), actual);
  const patch = actual.slice(actual.indexOf('    # oneulmwosinji:'));
  const output = execFileSync('ruby', ['-e', `
    require 'rubygems'
    Config = Struct.new(:build_settings)
    Target = Struct.new(:build_configurations)
    Project = Struct.new(:targets)
    Installer = Struct.new(:pods_project)
    configs = ['9.0', '13.4', '15.1', '16.0'].map { |v| Config.new({'IPHONEOS_DEPLOYMENT_TARGET' => v}) }
    installer = Installer.new(Project.new([Target.new(configs)]))
    ${patch}
    puts configs.map { |c| c.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] }.join(',')
  `], { encoding: 'utf8' });
  assert.equal(output.trim(), '15.1,15.1,15.1,16.0');
});
