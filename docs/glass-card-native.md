# GlassCard - native liquid glass

`GlassCard` renders **real native liquid glass** behind one shared API, picking
the best backend per device. It is the single glass surface used by every card
(SIM/subscription, home order/welcome blocks, orders rows, referral, account).

## Render tiers

`GlassCard` chooses a backend at runtime (`src/components/glassTier.ts`):

| Tier            | When                       | Backend |
|-----------------|----------------------------|---------|
| `ios-native`    | iOS **26+**                | Apple system glass via [`expo-liquid-glass-view`](https://github.com/rit3zh/expo-liquid-glass-view) |
| `android-native`| Android **API 33+** (13)   | GPU AGSL glass via the local `liquid-glass` module wrapping [`com.qmdeve.liquidglass:core`](https://github.com/QmDeve/AndroidLiquidGlassView) |
| `blur`          | iOS < 26 / Android < 33    | The `expo-blur` frosted card (real backdrop blur) |
| `flat`          | web / other                | A flat translucent dark card (the floor) |

The `blur` tier is a deliberate quality choice: it genuinely blurs the living
background and is the previously-shipped look, so older OSes still look good
rather than dropping straight to a flat card. The flat card is only the web floor.

## Architecture

- `GlassCard.tsx` - the facade. Resolves the variant token (`hero` | `subtle`)
  plus any `cornerRadius` / `tint` / `intensity` overrides into a stable token,
  draws the container (corner radius + faint light rim + padding), and renders
  an absolutely-positioned `<GlassBackground>` behind the content.
- `GlassBackground.ios.tsx` / `.android.tsx` / `.tsx` - platform-resolved glass
  layer (metro picks by extension). Native imports live **only** in their
  platform file, so the iOS module is never bundled on Android and vice-versa.
- `BlurBackground.tsx` - the shared `expo-blur` fallback used by both native
  files below their OS floor.
- `theme/glass.ts` - the tokens that drive every tier (one source of truth).

### Android sampling source

The QmDeve view refracts whatever ViewGroup it is **bound** to. We bind the
living background: `RootNavigator` wraps it in `BlurTargetView` and shares that
ref via `BlurTargetContext`; `GlassBackground.android.tsx` passes the ref's node
handle as `sourceViewId`, and the native module resolves it
(`appContext.findView`) and calls `LiquidGlassView.bind(source)`. This reuses the
exact target the `expo-blur` path already samples.

## Native module (`modules/liquid-glass`)

A **local Expo module** (Android only). It lives in the repo (not the
prebuild-generated `android/`, which is gitignored) so it survives
`expo prebuild --clean`. It is picked up automatically by Expo autolinking.

- Gradle dep: `com.qmdeve.liquidglass:core:1.0.3` (mavenCentral). Pinned to 1.0.3
  deliberately: 1.0.4+ require `compileSdk 37` (a newer AGP + the API-37 platform);
  1.0.3 has the identical public API with no such constraint, so it builds against
  the project's current SDK.
- Kotlin: `LiquidGlassExpoView` hosts the QmDeve view and maps props
  (`cornerRadius`, `blurRadius`, `refractionHeight`, `refractionOffset`,
  `dispersion`, `tint`, `sourceViewId`); units match the tokens (dp converted to
  px native-side).

## Rebuild required

This adds native code, so a JS reload is **not** enough - rebuild the dev client:

```bash
# iOS (needs Xcode 26 + an iOS 26 device/sim for the real glass effect)
npx expo prebuild -p ios
npx expo run:ios

# Android (needs a real API 33+ device for the GPU effect)
npx expo prebuild -p android
npx expo run:android
```

`expo prebuild` regenerates `ios/` and `android/`; the local module autolinks.

## On-device check

With the living background running, confirm:

- **iPhone (iOS 26):** cards show Apple system glass; the blue hue shows through.
- **Mid-range Android (API 33+):** cards show the AGSL glass refracting/breaking
  the hue at the edges; the orders list (`subtle`) stays smooth when stacked.
- **iOS < 26 / Android < 33:** clean `expo-blur` fallback - never blank/crash.

## Known risks (verify on device)

- **Skia capture (Android):** the QmDeve view samples the source via a hardware
  `RenderNode`. React Native Skia's canvas must be captured by that recording. If
  the living background renders into a `SurfaceView` (vs `TextureView`), the
  capture may come back empty - in that case the glass would look flat. Mitigation
  if so: force the orders rows (or all cards) to the `blur` tier, which is
  unaffected. The `blur` floor guarantees a good look regardless.
- **iOS remount:** `expo-liquid-glass-view` keys its view with `Math.random()`,
  so it remounts on every render of its parent. `GlassBackground` is memoised to
  avoid this; watch for flicker on rapidly re-rendering screens.
