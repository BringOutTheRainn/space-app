#!/usr/bin/env bash
# Creates the Capacitor Android project (if needed), applies the icon, splash
# and portrait lock, and builds a debug APK at build/stardust-empire.apk.
# Needs: npm install done, JDK 21 and the Android SDK.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d android ]; then
  npx cap add android
fi
npx cap sync android

# Google Play only accepts new apps and updates that target Android 16 (API 36)
# from August 31, 2026. Capacitor 7 defaults to 35, so raise compile and target.
PLAY_TARGET_SDK=36
sed -i -E "s/(compileSdkVersion|targetSdkVersion) = [0-9]+/\1 = $PLAY_TARGET_SDK/" android/variables.gradle
grep -q 'suppressUnsupportedCompileSdk' android/gradle.properties \
  || echo "android.suppressUnsupportedCompileSdk=$PLAY_TARGET_SDK" >> android/gradle.properties
grep -E 'compileSdkVersion|targetSdkVersion' android/variables.gradle

RES=android/app/src/main/res
for dpi in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  cp resources/android/mipmap-$dpi/*.png "$RES/mipmap-$dpi/"
done
# Adaptive icon background colour.
if [ -f "$RES/values/ic_launcher_background.xml" ]; then
  sed -i 's/#[0-9A-Fa-f]\{6\}/#120C33/' "$RES/values/ic_launcher_background.xml"
fi
# Splash image in every drawable folder that has one.
find "$RES" -name 'splash.png' -exec cp resources/android/splash.png {} \;
# AdMob app id (Google's test id unless ADMOB_APP_ID is set).
ADMOB_APP_ID=${ADMOB_APP_ID:-ca-app-pub-3940256099942544~3347511713}
MANIFEST=android/app/src/main/AndroidManifest.xml
# Android 13+ asks before showing notifications (reminders are opt-in in game).
if ! grep -q 'android.permission.POST_NOTIFICATIONS' "$MANIFEST"; then
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n</manifest>#' "$MANIFEST"
fi
if ! grep -q 'com.google.android.gms.ads.APPLICATION_ID' "$MANIFEST"; then
  sed -i "s#</application>#    <meta-data android:name=\"com.google.android.gms.ads.APPLICATION_ID\" android:value=\"$ADMOB_APP_ID\"/>\n    </application>#" "$MANIFEST"
fi
# Ad mediation: extra ad networks bid for each AdMob placement. Set
# ADMOB_MEDIATION_ADAPTERS to a comma-separated list of Gradle coordinates,
# e.g. "com.google.ads.mediation:applovin:13.0.1.0,com.google.ads.mediation:unity:4.13.0.0",
# and set up the matching mediation group in the AdMob console.
if [ -n "${ADMOB_MEDIATION_ADAPTERS:-}" ]; then
  IFS=',' read -ra ADAPTERS <<< "$ADMOB_MEDIATION_ADAPTERS"
  for dep in "${ADAPTERS[@]}"; do
    dep=$(echo "$dep" | xargs)
    if [ -n "$dep" ] && ! grep -q "$dep" android/app/build.gradle; then
      sed -i "0,/^dependencies {/s##dependencies {\n    implementation \"$dep\"#" android/app/build.gradle
      echo "Added mediation adapter $dep"
    fi
  done
fi
# Reminders do not need exact alarms; inexact ones keep the permission list short
# (the local notifications plugin falls back to inexact alarms without it).
if ! grep -q 'SCHEDULE_EXACT_ALARM' "$MANIFEST"; then
  grep -q 'xmlns:tools' "$MANIFEST" || sed -i 's#<manifest #<manifest xmlns:tools="http://schemas.android.com/tools" #' "$MANIFEST"
  sed -i 's#</manifest>#    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />\n</manifest>#' "$MANIFEST"
fi
# Portrait only.
MANIFEST=android/app/src/main/AndroidManifest.xml
if ! grep -q 'screenOrientation' "$MANIFEST"; then
  sed -i 's/<activity /<activity android:screenOrientation="portrait" /' "$MANIFEST"
fi

# Version: name from package.json, code from VERSION_CODE (CI run number) or 1.
VERSION_NAME=$(node -p "require('./package.json').version")
VERSION_CODE=${VERSION_CODE:-1}
sed -i "s/versionCode [0-9]*/versionCode $VERSION_CODE/; s/versionName \"[^\"]*\"/versionName \"$VERSION_NAME\"/" android/app/build.gradle

(cd android && ./gradlew assembleDebug --no-daemon)
mkdir -p build
cp android/app/build/outputs/apk/debug/app-debug.apk build/stardust-empire.apk
ls -la build/stardust-empire.apk

# Google Play needs native libraries aligned for 16 KB memory pages (Android 15+).
ZIPALIGN=$(ls "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/nonexistent}}"/build-tools/*/zipalign 2>/dev/null | sort -V | tail -1 || true)
if [ -n "$ZIPALIGN" ]; then
  if "$ZIPALIGN" -c -P 16 -v 4 build/stardust-empire.apk > build/zipalign.txt 2>&1; then
    echo "16 KB page alignment: OK ($(grep -c '\.so' build/zipalign.txt || true) native libraries)"
  else
    echo "::warning::Some native libraries are not 16 KB aligned:"
    grep -i '\.so' build/zipalign.txt | grep -iv 'OK' || tail -20 build/zipalign.txt
  fi
fi

# A signed release bundle for Google Play, only when a signing key is provided:
#   ANDROID_KEYSTORE_FILE, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
if [ -n "${ANDROID_KEYSTORE_FILE:-}" ] && [ -f "$ANDROID_KEYSTORE_FILE" ]; then
  (cd android && ./gradlew bundleRelease --no-daemon \
    -Pandroid.injected.signing.store.file="$ANDROID_KEYSTORE_FILE" \
    -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
    -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD")
  cp android/app/build/outputs/bundle/release/app-release.aab build/stardust-empire.aab
  ls -la build/stardust-empire.aab
fi
