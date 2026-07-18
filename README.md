# JouwPrivacy - customer app

The open-source customer app for **[JouwPrivacy](https://jouwprivacy.com)**, a
privacy-first mobile provider. Log in, see your SIM subscription(s), usage,
orders, referral and account info - a native companion to the website's
`/account` page.

We publish this app's source so anyone can **verify our privacy promise**: the
app talks **only** to the JouwPrivacy server, contains **no tracking, no
analytics, no ads, and no third-party SDKs**, and ships **no over-the-air
updates** - what you build is what runs.

Built with **Expo SDK 56 / React Native 0.85** (React 19, TypeScript 6). Dark
theme, Dutch + English. One codebase for the **Apple App Store**, **Google
Play**, and **F-Droid / Neo Store**.

---

## Install on Android with Obtainium

[Obtainium](https://github.com/ImranR98/Obtainium) installs and auto-updates
Android apps straight from their source — for JouwPrivacy, this repo's **GitHub
Releases**. No Google account, no Play Services, no tracking.

1. Install Obtainium (from its
   [GitHub Releases](https://github.com/ImranR98/Obtainium/releases) or F-Droid).
2. In Obtainium: **Add App** → paste
   `https://github.com/koenschauwaert/app-jouwprivacy.com` → **Add**.
3. Obtainium finds the latest Release, installs the signed
   `jouwprivacy-<version>.apk`, and offers the update whenever a new Release is
   published.

Every release is built and signed in CI and ships the APK plus its **SHA-256**,
so you can verify the download — see [`VERIFYING.md`](VERIFYING.md). How releases
are cut and signed is documented in [`RELEASING.md`](RELEASING.md).

## Privacy

- **One backend for all data.** Every API call goes exclusively to the
  JouwPrivacy backend-for-frontend (BFF) at `https://api.jouwprivacy.com` over
  HTTPS - no partner, advertising, or analytics service is ever called directly,
  and the app never receives partner identifiers (the server strips those). The
  only other first-party destinations are links the app hands to the system
  browser on an explicit tap: `jouwprivacy.com` pages and `files.jouwprivacy.com`
  invoice downloads. All externally opened URLs are validated as https
  first-party links (`src/utils/links.ts`, `src/api/HttpApiClient.ts`).
- **No tracking / no telemetry.** No Google Analytics, no Firebase, no crash
  reporters, no ad SDKs, no fingerprinting. Check `package.json` - there are no
  tracking dependencies.
- **No over-the-air updates.** `expo-updates` is intentionally not used, so the
  app never fetches or executes code from a remote source after install. A
  release is fully described by its build.
- **Secrets stay on device.** Session tokens and the app PIN live only in
  `expo-secure-store` (iOS Keychain / Android EncryptedSharedPreferences),
  never in plain storage and never in this repository.
- **Self-hosted assets.** Fonts and icons are bundled, not loaded from a CDN.

## Run

This is a bare React Native (Expo) app. The build is **fully local** on your own
machine with Gradle/Xcode - no Expo Go sandbox, no Expo cloud, no account, no
over-the-air updates.

```bash
npm install
npm run android     # native build + install on a device/emulator (NOT Expo Go)
npm run ios         # native build + install (macOS + Xcode)
npm start           # Metro for an already-installed dev build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # jest
```

The first `android`/`ios` build generates the gitignored `android/` and `ios/`
native projects from `app.json` (Android SDK + JDK 17, or Xcode, required).
Regenerate them from scratch with `npx expo prebuild --clean`.

> Expo SDK 56 tooling expects an LTS Node (20/22/24 - see `.nvmrc`). The Android
> build uses NDK 27 with `expo.useLegacyPackaging=false`, so native libraries are
> 16 KB page-size aligned (required by Google Play).

### Connecting to a backend

The app always talks to a real backend over HTTPS - there is no mock, demo, or
offline mode. Point a dev build at a staging or local BFF with
`EXPO_PUBLIC_API_URL` (see `.env.example`); it defaults to the production API.
Building the app needs **no secret** - see [`VERIFYING.md`](VERIFYING.md).

## Verifying

We publish this source so the app can be **independently checked and built**.
See [`VERIFYING.md`](VERIFYING.md) for how to build the app yourself from this
source (no secrets needed) and compare it to the official release. Each GitHub
Release attaches the built APK and its SHA-256. Byte-for-byte reproducible builds
are planned (status in `VERIFYING.md`), not yet achieved.

## Features

- **Auth + lock model** (`src/auth/`): email + password → 2FA (TOTP) →
  mandatory app PIN → optional biometric opt-in. Locks on every
  background→foreground transition. 3 failed PIN attempts **or** token expiry
  wipes the local session and returns to login.
- **4 tabs + Settings**: Home (SIM cards with usage rings), Orders (with
  invoice download + retention-deletion timers), Referral (share code + payout
  request, gated behind 2FA), Account (view/edit; edits require 2FA).
- **NL + EN** i18n with a typed key system (`src/i18n/`), NL default.
- **Dark-only** theme tokens (`src/theme/`).

## Structure

```
src/
  api/         contract types, HTTP client, error model
  auth/        AuthContext (auth/lock state machine), biometrics
  components/  Screen, Button, Card, TextField, ProgressRing, sheets, …
  hooks/       useAsync (loading / error / retry)
  i18n/        typed NL/EN translations + provider
  navigation/  Root → (Auth | PinSetup | Biometric | Lock | Main(Tabs + Settings))
  screens/     auth/, home/, orders/, referral/, account/, settings/
  storage/     secureStore wrapper, session, pin, preferences
  theme/       dark-only tokens
  utils/       date / money / usage formatting
  __tests__/   auth state-machine, 2FA gate, HTTP client + screen/format tests
modules/
  liquid-glass/  local Expo module bridging an Android liquid-glass view
```

## Distribution

- **Android APK via Obtainium (this repo).** Every version tag is built and
  signed in CI and published to this repo's GitHub Releases; install and
  auto-update it with [Obtainium](#install-on-android-with-obtainium). See
  [`RELEASING.md`](RELEASING.md).
- **Apple App Store / Google Play.** Built and signed by Overnight Technology.
  Signing material and store credentials are supplied at build time and are
  **not** part of this repository.
- **F-Droid / Neo Store.** With OTA removed, the app fetches/executes no code
  from non-free network sources. Inclusion in the official F-Droid repository
  additionally requires an `fdroiddata` metadata entry and a
  reproducible-from-source build on F-Droid's buildserver - **status: planned**
  (see [`VERIFYING.md`](VERIFYING.md)).

## Forking / rebranding

This repository is Apache-2.0 (see `LICENSE`), but the **name, logo, and icons
are trade names and brand assets and are not licensed for reuse** (see
`NOTICE`). If you build your own version you **must** rebrand and change
identifiers:

- `app.json`: `name`, `slug`, `scheme`, `ios.bundleIdentifier`,
  `android.package`.
- Replace the assets in `assets/` (icon, adaptive icon, logo) with your own.

## License

Code: **Apache-2.0** - see [`LICENSE`](LICENSE).
Trademarks & brand assets: **not licensed** - see [`NOTICE`](NOTICE).
