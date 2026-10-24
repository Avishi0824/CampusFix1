#!/bin/bash
set -e

echo "=========================================="
echo " CampusFix: Build & Install Updated App   "
echo "=========================================="

cd /Users/avishigupta/CampusFix1/mobile

# 1. Check if emulator is running, start if needed
if ! adb devices | grep -q "device$"; then
  echo "No active Android device detected."
  echo "Starting Pixel_8 emulator..."
  /Users/avishigupta/Library/Android/sdk/emulator/emulator -avd Pixel_8 &
  echo "Waiting for emulator to connect to adb..."
  adb wait-for-device
  echo "Waiting for Android system to finish booting..."
  while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
    sleep 2
  done
  echo "Emulator is online and ready!"
fi

echo "Connected devices:"
adb devices

# 2. Export updated JS bundle with Hermes bytecode
echo "Exporting updated bundle via Expo..."
rm -rf /tmp/expo-dist /tmp/apk-work
npx expo export -p android --output-dir /tmp/expo-dist

# 3. Prepare updated assets
mkdir -p /tmp/apk-work/assets
cp /tmp/expo-dist/_expo/static/js/android/*.hbc /tmp/apk-work/assets/index.android.bundle

# 4. Obtain base APK
if [ -f "/Users/avishigupta/CampusFix1/mobile/.base-template.apk" ]; then
  echo "Using local base template APK..."
  cp /Users/avishigupta/CampusFix1/mobile/.base-template.apk /tmp/apk-work/current.apk
else
  echo "Pulling current APK from device..."
  APK_PATH=$(adb shell pm path com.campusfix.app | head -n 1 | tr -d '\r' | cut -d: -f2)
  adb pull "$APK_PATH" /tmp/apk-work/current.apk
fi

# 5. Repackage APK with updated bundle
cd /tmp/apk-work
cp current.apk updated.apk
zip -d updated.apk "assets/index.android.bundle" "META-INF/*" > /dev/null 2>&1 || true
zip -u -0 updated.apk assets/index.android.bundle

# 6. Zipalign & Sign with Android debug keystore
echo "Aligning and signing APK..."
/Users/avishigupta/Library/Android/sdk/build-tools/35.0.0/zipalign -f -p 4 updated.apk aligned.apk
/Users/avishigupta/Library/Android/sdk/build-tools/35.0.0/apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android aligned.apk

# 7. Install and Launch
echo "Installing updated APK onto emulator..."
adb install -r aligned.apk

echo "Launching CampusFix..."
adb shell am start -n com.campusfix.app/.MainActivity

echo "=========================================="
echo " Done! App is running on the emulator.    "
echo "=========================================="
