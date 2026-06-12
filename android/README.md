# Rokhdad FIT Android App

This directory contains the configuration for the native Android application of Rokhdad FIT, built using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) as a Trusted Web Activity (TWA).

## 🚀 Building the App via GitHub Actions

The easiest way to get your APK is to use GitHub Actions:

1.  Push your changes to the `android-app` branch.
2.  Go to the **Actions** tab in your GitHub repository.
3.  Select the **"Build Android App"** workflow.
4.  Once completed, scroll down to the **"Artifacts"** section and download `app-release-apk`.

---

## 💻 Manual Local Build

If you want to build locally on your machine:

1.  Install [Node.js](https://nodejs.org/).
2.  Install the Bubblewrap CLI:
    ```bash
    npm install -g @bubblewrap/cli
    ```
3.  Navigate to this directory:
    ```bash
    cd android
    ```
4.  Initialize and Build:
    ```bash
    bubblewrap init --manifest https://athlete-2.vercel.app/manifest.webmanifest
    bubblewrap build
    ```

### 🛠 Troubleshooting: `zlib: unexpected end of file`

If you encounter `zlib: unexpected end of file` during the JDK/SDK download process in Bubblewrap, it's likely due to a network interruption or corrupted download.

**Solution: Manual Path Configuration**
Instead of letting Bubblewrap download the JDK and SDK, you can point it to your existing installations:

1.  Ensure you have **JDK 17** and the **Android SDK** installed.
2.  Run the configuration update command:
    ```bash
    bubblewrap updateConfig --jdkPath "/path/to/your/jdk-17" --androidSdkPath "/path/to/your/android-sdk"
    ```
3.  On macOS, your JDK path is often: `/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home`
4.  On macOS, your Android SDK path is often: `/Users/YOUR_USERNAME/Library/Android/sdk`

---

## 📦 Play Store Publishing

### 1. Digital Asset Links (DAL)

The app is configured to look for verification at:
`https://athlete-2.vercel.app/.well-known/assetlinks.json`

The file is already present in `public/.well-known/assetlinks.json`. **Important:** You must update the `sha256_cert_fingerprints` in that file with the actual fingerprint from your Google Play Console (found under **Setup > App Integrity**).

### 2. Production Signing

The current GitHub Action uses a temporary signing key. For production:
1.  Generate your own keystore: `keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias ...`
2.  Update `twa-manifest.json` with your `packageId` and signing details.
3.  (Recommended) Use GitHub Secrets to store your keystore (base64 encoded) and passwords to keep them secure.
