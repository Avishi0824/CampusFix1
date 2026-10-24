#!/bin/bash
set -e

echo "=========================================="
echo " Generating CampusFix Standalone APK      "
echo "=========================================="

cd /Users/avishigupta/CampusFix1/mobile

# 1. Export the latest JavaScript bundle with Hermes bytecode
echo "1. Exporting latest JavaScript bundle via Expo..."
rm -rf /tmp/expo-dist /tmp/apk-work
npx expo export -p android --output-dir /tmp/expo-dist

# 2. Package into APK
echo "2. Injecting bundle into APK..."
mkdir -p /tmp/apk-work/assets
cp /tmp/expo-dist/_expo/static/js/android/*.hbc /tmp/apk-work/assets/index.android.bundle

cp /Users/avishigupta/CampusFix1/mobile/.base-template.apk /tmp/apk-work/current.apk
cd /tmp/apk-work
cp current.apk updated.apk
zip -d updated.apk "assets/index.android.bundle" "META-INF/*" > /dev/null 2>&1 || true
zip -u -0 updated.apk assets/index.android.bundle

# 3. Zipalign & Sign
echo "3. Aligning and signing standalone APK..."
OUTPUT_APK="/Users/avishigupta/CampusFix1/mobile/CampusFix-v1.1.apk"
/Users/avishigupta/Library/Android/sdk/build-tools/35.0.0/zipalign -f -p 4 updated.apk "$OUTPUT_APK"
/Users/avishigupta/Library/Android/sdk/build-tools/35.0.0/apksigner sign --ks ~/.android/debug.keystore --ks-pass pass:android --key-pass pass:android "$OUTPUT_APK"

echo "=========================================="
echo " Standalone APK successfully created at:  "
echo " $OUTPUT_APK "
echo " Size: $(ls -lh "$OUTPUT_APK" | awk '{print $5}')"
echo "=========================================="
