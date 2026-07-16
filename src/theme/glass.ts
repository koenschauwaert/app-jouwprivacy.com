// SPDX-License-Identifier: Apache-2.0
import { radius } from '@/theme';

/**
 * Shared liquid-glass tokens so every GlassCard is uniform across all render
 * tiers. One token drives four possible backends, picked at runtime by
 * `GlassCard` (see `GlassBackground.*` + `glassTier.ts`):
 *
 *  - iOS 26+      real Apple glass via `expo-liquid-glass-view`
 *  - Android 13+  GPU AGSL glass via the local `liquid-glass` native module
 *  - else         the expo-blur frosted card (real backdrop blur)
 *  - web          a flat translucent card (last-resort floor)
 *
 * Tune on device. The `hero` token is the full look (e.g. the SIM card); the
 * `subtle` token is lighter/cheaper for dense repeated rows (the orders list).
 */
export interface GlassToken {
  /** Rounded corners (dp), shared by every tier. */
  cornerRadius: number;
  /** expo-blur intensity 1-100 (blur fallback tier). */
  intensity: number;
  /** Dark tint laid over the blur/flat tiers - alpha controls how dark. */
  tint: string;
  /** iOS `expo-liquid-glass-view` mapping. `type` is its glass kind. */
  ios: {
    type: 'clear' | 'tint' | 'regular' | 'interactive' | 'identity';
    /** Dark, near-black system tint so the living blue shows through. */
    tint: string;
  };
  /**
   * Android QmDeve mapping. Units match the native setters: refraction in dp
   * (clamped 12-50 / 20-120 native-side), blur 0.01-50, dispersion 0-1, and a
   * dark low-alpha tint colour. See `modules/liquid-glass`.
   */
  android: {
    blurRadius: number;
    refractionHeight: number;
    refractionOffset: number;
    dispersion: number;
    tint: string;
  };
}

export const GLASS: GlassToken = {
  cornerRadius: radius.md,
  intensity: 55,
  tint: 'rgba(11, 11, 15, 0.62)',
  ios: { type: 'regular', tint: 'rgba(11, 11, 15, 0.7)' },
  android: {
    blurRadius: 4,
    refractionHeight: 28,
    refractionOffset: 70,
    dispersion: 0.85,
    tint: 'rgba(11, 11, 15, 0.62)',
  },
};

/**
 * Inner edge-light ("rim"). A thin sheen a couple of px inside the top and left
 * edges only - the facet where light catches the black glass. Deliberately not
 * the old hard outline and not white: just a hair brighter than the near-black
 * tint, so it reads as a shine/shard of the glass, not a border. Tune on device.
 */
export const GLASS_RIM = {
  /** How far the sheen sits inside the card edge (dp). */
  inset: 2,
  /** Cool, dim highlight - brighter than the glass tint, far from white. */
  color: 'rgba(155, 166, 196, 0.16)',
};

/** Lighter/cheaper for dense, repeated rows (e.g. the orders list). */
export const GLASS_SUBTLE: GlassToken = {
  cornerRadius: radius.md,
  intensity: 35,
  tint: 'rgba(11, 11, 15, 0.66)',
  ios: { type: 'clear', tint: 'rgba(11, 11, 15, 0.72)' },
  android: {
    blurRadius: 2,
    refractionHeight: 20,
    refractionOffset: 50,
    dispersion: 0.7,
    tint: 'rgba(11, 11, 15, 0.66)',
  },
};
