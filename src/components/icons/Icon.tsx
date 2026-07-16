// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { ICON_PATHS, IconName } from './paths';

interface IconProps {
  name: IconName;
  /** Fill color - pass a theme token so icons follow the dark theme. */
  color: string;
  size?: number;
}

/** Tintable Material Symbols icon (filled, 24-grid). */
export function Icon({ name, color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path d={ICON_PATHS[name]} fill={color} />
    </Svg>
  );
}
