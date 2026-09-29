# Native mobile (Android, iOS, React Native, Flutter)

Capability depends on the machine. Detect first, then use the best available option and report what was skipped.

## Detect
- Android: `adb devices` (real device or running emulator), `emulator -list-avds`, ANDROID_HOME set
- iOS: only on macOS; `xcrun simctl list devices`, Xcode installed
- Cross-platform frameworks: check for `flutter`, `react-native`, `expo` in the project
- Automation tools: Maestro, Appium, Detox, Flutter integration_test, Espresso, XCUITest

## Build and launch
Follow the project's README. Debug builds are fine in the Open tier. For store/production builds, treat as Guarded.

## Driving the app
- Android without a framework: `adb shell input tap/swipe/text`, `adb exec-out screencap -p > shot.png`, `adb shell uiautomator dump` for the UI tree, `adb logcat` for logs and crashes
- iOS simulator: `xcrun simctl` for install/launch/screenshot/permissions/push; UI driving needs XCUITest or Maestro
- Prefer Maestro or the project's own test framework when available; write flows as YAML/tests and leave them in the repo

## Mobile-specific checks (on top of the standard layers)
- Install, first launch, permission prompts (grant, deny, deny-forever), upgrade over an older build
- Rotation, split screen, font scaling, dark mode, different screen sizes and densities
- Interruptions: incoming call, background/foreground, low-memory kill and restore, app switch mid-flow
- Connectivity: airplane mode, flaky network, switching wifi to cellular; offline behavior and sync
- Deep links and push notification taps land on the right screen
- Back button / gesture behavior, keyboard covering inputs, safe areas and notches
- Crashes and ANRs in logcat / crash logs; treat any crash as at least High
- Storage: what is stored locally, is it cleared on logout

## If no emulator or device is available
Say so at the top of the report. Do a static review of the code for the checks above, run unit/widget tests, and recommend the specific device tests still needed.
