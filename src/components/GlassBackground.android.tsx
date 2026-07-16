// SPDX-License-Identifier: Apache-2.0
import React, { useContext, useEffect, useState } from 'react';
import { findNodeHandle, processColor, StyleSheet, View, ViewProps } from 'react-native';
import { requireNativeView } from 'expo';

import { BlurBackground } from './BlurBackground';
import { currentGlassTier } from './glassTier';
import { BlurTargetContext } from './glassContext';
import type { GlassBackgroundProps } from './glassBackgroundTypes';

interface NativeLiquidGlassProps extends ViewProps {
  cornerRadius: number;
  blurRadius: number;
  refractionHeight: number;
  refractionOffset: number;
  dispersion: number;
  tint: number | null;
  /** React node handle of the living-background view to sample (its source). */
  sourceViewId?: number | null;
}

// Provided by the local `liquid-glass` Expo module (modules/liquid-glass).
const NativeLiquidGlass = requireNativeView<NativeLiquidGlassProps>('LiquidGlass');

/**
 * Android glass background. On API 33+ this is the QmDeve GPU (AGSL) glass,
 * bridged via the local native module; it binds the living background (the same
 * target the expo-blur path samples) and refracts it. Below 33 the native view
 * renders nothing, so we fall through to the shared expo-blur card.
 */
function GlassBackgroundComponent({ token }: GlassBackgroundProps) {
  const blurTarget = useContext(BlurTargetContext);

  // The BlurTargetView's ref is attached during the commit phase. Cards that
  // mount in the SAME commit as that target (the login/2FA flow on cold start)
  // read `blurTarget.current === null` on their first render, and because this
  // component is memoised with no prop that changes when the ref later
  // populates, it would never re-render - so the native glass would sample
  // nothing forever (blank card). Re-render once after mount so we pick up the
  // now-attached ref. Cards mounted later (the main app) already see a valid
  // ref on first render, so this is a no-op for them.
  const [, markReady] = useState(false);
  useEffect(() => {
    // Intentional one-shot re-render to pick up the same-commit ref (see above).
    // Guarded + idempotent (false->true once, value never read), so it cannot
    // cascade - which is what set-state-in-effect guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (blurTarget?.current) markReady(true);
  }, [blurTarget]);

  if (currentGlassTier() !== 'android-native') {
    return <BlurBackground token={token} />;
  }
  const sourceViewId = blurTarget?.current ? findNodeHandle(blurTarget.current) : null;
  return (
    <>
      {/* Tinted floor under the glass. The GPU glass samples nothing until the
          Skia living background has rendered its first frames (a cold-start
          warmup) - without this floor the card would flash fully transparent
          during that window (the "no glass on first launch" report). The opaque
          refraction draws over this once it kicks in, so the floor only shows
          when the glass has nothing yet, keeping the surface reading as a card. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: token.android.tint }]}
      />
      <NativeLiquidGlass
        pointerEvents="none"
        cornerRadius={token.cornerRadius}
        blurRadius={token.android.blurRadius}
        refractionHeight={token.android.refractionHeight}
        refractionOffset={token.android.refractionOffset}
        dispersion={token.android.dispersion}
        tint={(processColor(token.android.tint) as number | null) ?? null}
        sourceViewId={sourceViewId}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

export const GlassBackground = React.memo(GlassBackgroundComponent);
