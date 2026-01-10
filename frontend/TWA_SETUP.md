# TWA (Trusted Web Activity) Setup for Arvind Sweets

This guide explains how to create a TWA Android app that runs your PWA natively (no WebView).

## Prerequisites

1. Your PWA must be deployed to HTTPS (e.g., `https://arvindsweets.com`)
2. Android Studio installed
3. Java JDK 11+ installed

---

## Option 1: Use Bubblewrap (Recommended - Easiest)

Google's **Bubblewrap** CLI generates a complete TWA Android project.

### Step 1: Install Bubblewrap

```bash
npm install -g @anthropic-ai/anthropic-bubblewrap
```

### Step 2: Initialize TWA Project

```bash
mkdir arvind-sweets-twa
cd arvind-sweets-twa
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.json
```

Replace `YOUR_DOMAIN` with your actual deployed domain.

### Step 3: Answer the prompts

- **Application ID**: `com.arvindsweets.app`
- **App name**: `Arvind Sweets`
- **Launcher name**: `Arvind Sweets`
- **Theme color**: `#ea580c`
- **Background color**: `#ffffff`
- **Start URL**: `/`
- **Display mode**: `standalone`
- **Status bar color**: `#ea580c`
- **Splash screen color**: `#ffffff`

### Step 4: Build the APK

```bash
bubblewrap build
```

This creates:
- `app-release-signed.apk` - Ready for Play Store
- `app-release-unsigned.apk` - For testing

### Step 5: Digital Asset Links (Required!)

Create a file at `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.arvindsweets.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

Get your SHA256 fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

For release builds, use your release keystore.

---

## Option 2: PWA Builder (No Code)

1. Go to https://www.pwabuilder.com/
2. Enter your deployed PWA URL
3. Click "Package for stores"
4. Download the Android (TWA) package
5. Upload to Google Play Store

---

## Option 3: Manual Android Studio Setup

### Step 1: Create New Android Project

- Template: Empty Activity
- Package name: `com.arvindsweets.app`
- Minimum SDK: API 19

### Step 2: Add TWA Dependencies

In `app/build.gradle`:

```gradle
dependencies {
    implementation 'com.google.androidbrowserhelper:androidbrowserhelper:2.5.0'
}
```

### Step 3: Configure AndroidManifest.xml

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.arvindsweets.app">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Arvind Sweets"
        android:theme="@style/Theme.LauncherTheme">

        <meta-data
            android:name="asset_statements"
            android:resource="@string/asset_statements" />

        <activity
            android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
            android:exported="true">

            <meta-data
                android:name="android.support.customtabs.trusted.DEFAULT_URL"
                android:value="https://YOUR_DOMAIN" />

            <meta-data
                android:name="android.support.customtabs.trusted.STATUS_BAR_COLOR"
                android:resource="@color/colorPrimary" />

            <meta-data
                android:name="android.support.customtabs.trusted.NAVIGATION_BAR_COLOR"
                android:resource="@color/navigationColor" />

            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_IMAGE_DRAWABLE"
                android:resource="@drawable/splash" />

            <meta-data
                android:name="android.support.customtabs.trusted.SPLASH_SCREEN_BACKGROUND_COLOR"
                android:resource="@color/backgroundColor" />

            <meta-data
                android:name="android.support.customtabs.trusted.SCREEN_ORIENTATION"
                android:value="portrait" />

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="https" android:host="YOUR_DOMAIN"/>
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### Step 4: Add strings.xml

```xml
<resources>
    <string name="app_name">Arvind Sweets</string>
    <string name="asset_statements">
        [{
            \"relation\": [\"delegate_permission/common.handle_all_urls\"],
            \"target\": {
                \"namespace\": \"web\",
                \"site\": \"https://YOUR_DOMAIN\"
            }
        }]
    </string>
</resources>
```

---

## Digital Asset Links Verification

**Critical**: Without proper Digital Asset Links, Chrome will show a browser URL bar.

1. Deploy `/.well-known/assetlinks.json` to your server
2. Verify at: https://developers.google.com/digital-asset-links/tools/generator
3. Test locally: `adb shell am start -a android.intent.action.VIEW -d "https://YOUR_DOMAIN"`

---

## Testing

1. Build and install the APK on a device/emulator
2. The app should launch in full-screen mode (no URL bar)
3. If you see a URL bar, check Digital Asset Links

---

## Publishing to Play Store

1. Generate signed APK/AAB
2. Create Google Play Developer account ($25 one-time fee)
3. Upload to Play Console
4. Fill in store listing, screenshots, etc.
5. Submit for review

---

## Icon Requirements

For TWA, you need these icon sizes in `public/icons/`:

- `icon-48.png` (48x48)
- `icon-72.png` (72x72)  
- `icon-96.png` (96x96)
- `icon-128.png` (128x128)
- `icon-144.png` (144x144)
- `icon-152.png` (152x152)
- `icon-192.png` (192x192)
- `icon-384.png` (384x384)
- `icon-512.png` (512x512)
- `maskable-icon-192.png` (192x192 with safe zone padding)
- `maskable-icon-512.png` (512x512 with safe zone padding)

Use https://maskable.app/editor to create maskable icons.

---

## Benefits of TWA vs WebView

| Feature | TWA | WebView |
|---------|-----|---------|
| Performance | Chrome engine | Older engine |
| Storage | Shared with Chrome | Separate |
| Cookies | Shared with Chrome | Separate |
| Push Notifications | ✅ Full support | ❌ Limited |
| Web APIs | ✅ Full support | ⚠️ Partial |
| Updates | Automatic via web | Requires app update |
| Offline | ✅ Service Worker | ⚠️ Manual |
