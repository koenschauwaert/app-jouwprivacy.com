// SPDX-License-Identifier: Apache-2.0
import type { GlassToken } from '@/theme/glass';

/**
 * Props for the platform-resolved `GlassBackground` (the absolutely-positioned
 * glass layer behind a GlassCard's content). The token already carries the
 * resolved corner radius / tint / intensity, so the surface just reads it.
 */
export interface GlassBackgroundProps {
  token: GlassToken;
}
