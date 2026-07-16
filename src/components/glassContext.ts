// SPDX-License-Identifier: Apache-2.0
import { createContext } from 'react';
import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Android's glass backends (expo-blur's dimezis blur AND the QmDeve native
 * module) need a *source* view to sample - the living background. RootNavigator
 * wraps that background in a target view and provides its ref here; the cards
 * pass the target's node handle to native, which binds it as the sampling
 * source. iOS samples the real backdrop, so this is a no-op there.
 */
export const BlurTargetContext = createContext<RefObject<View | null> | null>(null);
