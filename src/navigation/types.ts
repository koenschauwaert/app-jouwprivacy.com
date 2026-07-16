// SPDX-License-Identifier: Apache-2.0
import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabsParamList = {
  Home: undefined;
  Orders: undefined;
  Referral: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabsParamList>;
  Settings: undefined;
  ChangePin: undefined;
  Tickets: undefined;
};

/** Shared PIN length for setup, change and unlock. */
export const PIN_LENGTH = 5;

/** Length of a TOTP 2FA code. */
export const TOTP_LENGTH = 6;

/** Number of significant chars in a recovery code (excludes the grouping dash). */
export const RECOVERY_CODE_LENGTH = 10;
