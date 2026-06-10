# Rokhdad FIT Android App

This directory contains the configuration for the native Android application of Rokhdad FIT, built using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) as a Trusted Web Activity (TWA).

## Building the App

The application is automatically built via GitHub Actions whenever changes are pushed to the `android-app` branch.

### Manual Build

To build the app manually on your machine:

1.  Install [Node.js](https://nodejs.org/).
2.  Install the Bubblewrap CLI:
    ```bash
    npm install -g @bubblewrap/cli
    ```
3.  Navigate to this directory:
    ```bash
    cd android
    ```
4.  Initialize the project:
    ```bash
    bubblewrap init --manifest https://athlete-2.vercel.app/manifest.webmanifest
    ```
5.  Build the project:
    ```bash
    bubblewrap build
    ```

## Play Store Publishing

To publish the app to Google Play, you need to:

### 1. Digital Asset Links (DAL)

Google Play requires verification that you own the domain. You must host a file at:
`https://athlete-2.vercel.app/.well-known/assetlinks.json`

The content should look like this (replace with your actual certificate fingerprint):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.rokhdad.athlete",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT"
    ]
  }
}]
```

You can find your SHA256 fingerprint in the Google Play Console under **Setup > App Integrity**.

### 2. Signing the App

For a production release, you must sign the APK/AAB with your own keystore. The current GitHub Action uses a temporary signing key for demonstration.

For production builds in CI:
1.  Generate a keystore file.
2.  Add the keystore file (base64 encoded) and passwords as GitHub Secrets.
3.  Update the workflow to use these secrets.

## Configuration

The main configuration is stored in `twa-manifest.json`. If you change the app name, icons, or package ID, update this file and rebuild.
