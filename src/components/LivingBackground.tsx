// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas, Circle, Fill, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors } from '@/theme';

/**
 * App-wide "living" background: a few solid blue discs that very slowly drift,
 * breathe (resize), and shift hue over the dark base. Mounted ONCE behind the
 * navigator (see RootNavigator) so a single loop runs uninterrupted across every
 * tab/screen - it never restarts on a tab switch.
 *
 * The animation runs entirely on the UI thread via Skia's clock + reanimated
 * derived values, so React never re-renders to animate (the discs are plain
 * solid circles - no blur/gradient - so there's nothing else to draw).
 *
 * - Calm by design: 20-40s cycles, palette bounded around #165DF5.
 * - Respects "reduce motion": derives a single static frame, no ticking.
 * - The OS stops rendering when backgrounded, so the clock effectively pauses.
 * - Non-interactive (pointerEvents none) and sits behind all content.
 */

const TAU = Math.PI * 2;

// --- Grain -------------------------------------------------------------------
// A dotted-noise fill for the discs so they match the wallpaper's film grain.
// The shader samples noise in disc-NORMALIZED coordinates ((xy - center) / radius),
// so the grain is welded to the disc's own frame: it translates AND scales in
// lockstep as the disc drifts and breathes - it's painted onto the disc, not a
// separate texture the disc slides over. The Circle clips it, so edges stay sharp.
const GRAIN_CELLS = 150; // dot cells across the disc radius; higher = finer stipple
const GRAIN_STRENGTH = 0.06; // 0..1 luminance jitter around the base colour (subtle, not soft)

// `Make` returns null where runtime shaders aren't available; Blob falls back to
// a flat colour fill (the original look) in that case.
const NOISE = Skia.RuntimeEffect.Make(`
uniform float2 center;
uniform float radius;
uniform float4 color;
uniform float cells;
uniform float strength;

float hash(float2 p) {
  p = fract(p * float2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

half4 main(float2 xy) {
  float2 q = (xy - center) / radius;        // disc-normalized: grain is glued to the disc
  float n = hash(floor(q * cells));         // one value per dot cell, fixed to the disc
  float grain = (n - 0.5) * 2.0;            // -1..1
  float3 rgb = color.rgb * (1.0 + grain * strength);
  return half4(rgb * color.a, color.a);     // Skia expects premultiplied alpha
}
`);

interface BlobSpec {
  /** anchor as a fraction of the screen */
  ax: number;
  ay: number;
  /** drift amplitude as a fraction of width/height */
  dx: number;
  dy: number;
  /** radius (fraction of the larger screen edge) + breathing amplitude */
  rBase: number;
  rAmp: number;
  /** hue centre + sway, kept in the blue→cyan/purple band */
  hue: number;
  hueAmp: number;
  /** peak opacity over the dark base */
  alpha: number;
  /** cycle lengths in seconds (drift / radius / hue) */
  pPos: number;
  pR: number;
  pHue: number;
  /** phase offset so the discs are out of sync */
  phase: number;
}

// 4 discs anchored toward the edges/corners so colour eases in and out of view.
const BLOBS: BlobSpec[] = [
  {
    ax: 0.16,
    ay: 0.08,
    dx: 0.18,
    dy: 0.12,
    rBase: 0.58,
    rAmp: 0.12,
    hue: 222,
    hueAmp: 16,
    alpha: 0.38,
    pPos: 34,
    pR: 27,
    pHue: 41,
    phase: 0.0,
  },
  {
    ax: 0.88,
    ay: 0.22,
    dx: 0.16,
    dy: 0.16,
    rBase: 0.5,
    rAmp: 0.14,
    hue: 208,
    hueAmp: 14,
    alpha: 0.32,
    pPos: 39,
    pR: 31,
    pHue: 47,
    phase: 1.7,
  },
  {
    ax: 0.28,
    ay: 0.9,
    dx: 0.2,
    dy: 0.14,
    rBase: 0.62,
    rAmp: 0.13,
    hue: 242,
    hueAmp: 12,
    alpha: 0.3,
    pPos: 31,
    pR: 24,
    pHue: 53,
    phase: 3.1,
  },
  {
    ax: 0.82,
    ay: 0.84,
    dx: 0.14,
    dy: 0.18,
    rBase: 0.52,
    rAmp: 0.15,
    hue: 226,
    hueAmp: 18,
    alpha: 0.26,
    pPos: 43,
    pR: 29,
    pHue: 37,
    phase: 4.6,
  },
];

/** HSL (s,l in 0..1) → [r, g, b] each 0..1. Worklet so it can run on the UI
 * thread inside the derived colour/uniform values. */
function hslToRgb01(h: number, s: number, l: number): [number, number, number] {
  'worklet';
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g] = [c, x];
  else if (hp < 2) [r, g] = [x, c];
  else if (hp < 3) [g, b] = [c, x];
  else if (hp < 4) [g, b] = [x, c];
  else if (hp < 5) [r, b] = [x, c];
  else [r, b] = [c, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

/** Same colour as an "rgba(...)" string Skia accepts (flat-fill fallback). */
function hslaToRgba(h: number, s: number, l: number, a: number): string {
  'worklet';
  const [r, g, b] = hslToRgb01(h, s, l);
  const to255 = (v: number) => Math.round(v * 255);
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${a.toFixed(3)})`;
}

function Blob({
  spec,
  clock,
  width,
  height,
  reduced,
}: {
  spec: BlobSpec;
  clock: SharedValue<number>;
  width: number;
  height: number;
  reduced: boolean;
}) {
  // Capture primitives (not the object) so the worklets close over plain numbers.
  const { ax, ay, dx, dy, rBase, rAmp, hue, hueAmp, alpha, pPos, pR, pHue, phase } = spec;

  const cx = useDerivedValue(() => {
    const t = reduced ? 0 : clock.value / 1000;
    return ax * width + dx * width * Math.sin((t * TAU) / pPos + phase);
  }, [width, height, reduced]);

  const cy = useDerivedValue(() => {
    const t = reduced ? 0 : clock.value / 1000;
    return ay * height + dy * height * Math.cos((t * TAU) / (pPos * 1.13) + phase * 1.3);
  }, [width, height, reduced]);

  const r = useDerivedValue(() => {
    const t = reduced ? 0 : clock.value / 1000;
    const sMax = Math.max(width, height);
    // 0.4 factor so each disc reads as a bounded circle, not a full-screen wash.
    return (rBase + rAmp * Math.sin((t * TAU) / pR + phase)) * sMax * 0.4;
  }, [width, height, reduced]);

  // Shader fill: the animated base colour plus the dotted grain, in disc-local
  // coords (center) so the noise rides along with the disc.
  const uniforms = useDerivedValue(() => {
    const t = reduced ? 0 : clock.value / 1000;
    const h = hue + hueAmp * Math.sin((t * TAU) / pHue + phase);
    // Gentle opacity breathing so colour feels like it "comes into" the screen.
    const a = alpha * (0.72 + 0.28 * Math.sin((t * TAU) / (pPos * 0.83) + phase * 0.6));
    const [r0, g0, b0] = hslToRgb01(h, 1, 0.5);
    return {
      center: [cx.value, cy.value],
      radius: r.value,
      color: [r0, g0, b0, a],
      cells: GRAIN_CELLS,
      strength: GRAIN_STRENGTH,
    };
  }, [reduced]);

  // Flat-colour fallback for runtimes without runtime shaders.
  const color = useDerivedValue(() => {
    const t = reduced ? 0 : clock.value / 1000;
    const h = hue + hueAmp * Math.sin((t * TAU) / pHue + phase);
    const a = alpha * (0.72 + 0.28 * Math.sin((t * TAU) / (pPos * 0.83) + phase * 0.6));
    return hslaToRgba(h, 1, 0.5, a);
  }, [reduced]);

  if (NOISE) {
    return (
      <Circle cx={cx} cy={cy} r={r}>
        <Shader source={NOISE} uniforms={uniforms} />
      </Circle>
    );
  }
  return <Circle cx={cx} cy={cy} r={r} color={color} />;
}

export function LivingBackground() {
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const clock = useClock();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={styles.canvas}>
        <Fill color={colors.background} />
        {BLOBS.map((spec, i) => (
          <Blob key={i} spec={spec} clock={clock} width={width} height={height} reduced={reduced} />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
});
