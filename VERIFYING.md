# Verifying this app

JouwPrivacy publishes this app's full source so anyone can check what it does.
This document explains how to (1) build the app yourself from this source with
no secrets, and (2) compare your build to the official release. It also records,
honestly, how far end-to-end **reproducibility** has gotten.

## What you can verify today

- **The whole app builds from public source, with no secrets.** Nothing in this
  repository must be kept secret to build a working app. Only *signing* a release
  for the app stores needs a private key, which is not - and must never be - in
  this repo. Building an unsigned (or debug) APK needs no secret at all.
- **There is no hidden network.** The app talks only to `api.jouwprivacy.com`,
  and opens first-party `jouwprivacy.com` links / `files.jouwprivacy.com`
  downloads in the system browser. See `src/api/`. There is no analytics,
  tracking, or ad SDK (check `package.json`), and **no over-the-air updates** -
  `expo-updates` is intentionally absent and a config plugin strips its inert
  leftovers (`plugins/withCleanUpdatesManifest.js`), so what is built is what
  runs.

## Build it yourself

Prerequisites: Node 20/22/24 (see `.nvmrc`), plus the Android SDK and JDK 17 for
Android (or Xcode for iOS).

```bash
npm ci
npx expo prebuild --clean --platform android   # generates the native android/ project
cd android
./gradlew assembleRelease                       # produces an unsigned release APK
# output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

For a quick check you can also build a debug APK with `./gradlew assembleDebug`;
it is signed with Android's well-known public debug key, which is not a secret.

## Compare to the official release

Each official GitHub Release attaches the built APK and its **SHA-256** hash, so
you can confirm the artifact you downloaded matches what we published:

```bash
shasum -a 256 jouwprivacy-<version>.apk
```

You can also unzip both your APK and the released one and diff their contents.
Ignore the **signature block** (`META-INF/*.RSA`, `*.SF`, `*.MF`): only the
official key can produce our signature, so those files always differ - that is
expected and is not part of "is the code the same".

> A byte-identical APK match is only guaranteed once **reproducible builds**
> (below) are in place. Until then, this lets you build from source, run the
> result, and diff the non-signature contents.

## Verify the signing certificate (authenticity)

The SHA-256 above proves the bytes you downloaded match what we published. The
**signing certificate** proves *we* built it — and it is the mechanism Obtainium
and Android use to guarantee every future update comes from us and nobody else.

- **Package ID:** `com.jouwprivacy.app`
- **SHA-256 of the signing certificate:** shown in every GitHub Release's notes,
  and pinned in [`signing-cert-sha256.txt`](signing-cert-sha256.txt).

This fingerprint is **the same for every version** - it comes from our private
signing key, which never changes. Android refuses any update signed by a
different key, so nobody can push a malicious "update" over the real app. Our CI
re-derives it on every release and refuses to publish if it ever drifts.

Check it yourself against any downloaded APK:

```bash
apksigner verify --print-certs jouwprivacy-<version>.apk   # from the Android SDK build-tools
# or, without the Android SDK:
keytool -printcert -jarfile jouwprivacy-<version>.apk
```

Find the `SHA-256 digest` line and compare it to the value above.

> The Google Play and Apple App Store builds are signed with **different** keys
> (Play may re-sign via Play App Signing). That is expected - each distribution
> channel updates only within itself. The fingerprint here is specifically the
> GitHub / Obtainium APK's.

## Reproducible builds - status: PLANNED (not yet achieved)

Independently reproducing a **byte-for-byte identical** release is the strongest
form of verification. We are working toward it but **do not claim it works yet.**
For an Expo / React Native app it requires pinning and controlling at least:

- the toolchain: Node, JDK, the Android SDK/build-tools, **NDK**, Gradle, and the
  React Native / Hermes versions (Hermes bytecode must build deterministically);
- inputs that otherwise vary build-to-build: timestamps, file ordering inside the
  APK/AAB, embedded absolute paths, and `versionCode` / `versionName`;
- a documented, pinned (ideally containerised) build environment so a third party
  runs the exact same steps.

The endpoint is inclusion in **F-Droid**, whose build server independently
rebuilds the app from this source and verifies it against the published release
(its "Reproducible Builds" status). That work is planned; this section will be
updated only once reproducibility is actually demonstrated - not before.
