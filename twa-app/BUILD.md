# Arvind Sweets — Android TWA (Play Store) Build

This folder is for the Bubblewrap (Trusted Web Activity) Android project.

## 0) One-time prerequisites

- Node.js 18+ (you already have Node)
- Java **JDK 17** recommended (Bubblewrap can download its own JDK 17)
- Android Studio (recommended) or just Android SDK build tools

This repo also includes helper scripts:
- `01_config_bubblewrap.cmd` (points Bubblewrap to JDK 17 + Android SDK)
- `02_init_twa.cmd` (generates the Android TWA project)
- `03_build_local_apk.cmd` (builds locally for device testing)

## 1) Make sure your site is ready

Your PWA must have:
- `https://arvindsweets.com/manifest.json`
- `https://arvindsweets.com/sw.js` registered
- icons referenced by the manifest **must exist**

In this repo, icons are generated from `frontend/public/icons/icon-512.png`.

Generate icon set locally:

```bash
cd "s:\Workplace\Arvind sweets\frontend"
npm install
npm run generate:pwa-icons
```

Then deploy the frontend so these files exist on the live domain.

## 2) Install / run Bubblewrap

Recommended (no global install):

```bash
npx --yes @bubblewrap/cli --version
```

If you prefer global:

```bash
npm i -g @bubblewrap/cli
bubblewrap --version
```

## 3) Create a signing keystore (required)

From this folder:

Already created for you in this workspace: `twa-app/android.keystore` (password: `changeit` for local testing).

Before production / Play Store, regenerate with your own strong password.

## 4) Get SHA-256 fingerprint for Digital Asset Links

```bash
keytool -list -v -keystore android.keystore -alias arvindsweets
```

`assetlinks.json` is already updated in this workspace. You still need to deploy it so it is live at:

- `https://arvindsweets.com/.well-known/assetlinks.json`

Then deploy so this is live:

- `https://arvindsweets.com/.well-known/assetlinks.json`

## 5) Initialize Bubblewrap project (generates Android app)

Run init and follow prompts:

```bash
cd "s:\Workplace\Arvind sweets\twa-app"

npx --yes @bubblewrap/cli updateConfig --jdkPath "C:\Users\<you>\.jdk\jdk-17.x" --androidSdkPath "%LOCALAPPDATA%\Android\Sdk"

npx --yes @bubblewrap/cli init --manifest https://arvindsweets.com/manifest.json
```

Use these values when asked:
- **Package**: `com.arvindsweets.app`
- **App name**: `Arvind Sweets`
- **Launcher name**: `Arvind Sweets`
- **Start URL**: `/?source=twa`
- **Theme color**: `#ea580c`

Note: this folder already includes a starter config at [twa-app/twa-manifest.json](twa-manifest.json).

## 6) Build AAB for Play Store

For now (no Play Store), just build locally inside the generated Bubblewrap project folder:

```bash
npx --yes @bubblewrap/cli build
```

This produces build artifacts you can use for device testing. Play Store upload can be done later.

## 7) OAuth / Maps / Payments notes

- TWA runs in Chrome Custom Tabs (not WebView), so web-based Google OAuth and Maps JS continue to work as on the website.
- If you use domain-restricted OAuth redirect URIs, keep them on `https://arvindsweets.com/*`.
- Payments that rely on browser APIs should behave the same as Chrome on Android.

---

If you want, I can also add a `.gitignore` here to exclude the keystore and generated Android folders.
