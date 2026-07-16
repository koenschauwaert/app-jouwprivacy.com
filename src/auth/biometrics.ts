// SPDX-License-Identifier: Apache-2.0
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/** Whether the device has biometric hardware AND the user has enrolled. */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const [hasHardware, isEnrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hasHardware && isEnrolled;
  } catch {
    // Treat any availability error as "not available" - fail closed.
    return false;
  }
}

/** Prompt the OS biometric dialog. Returns true on success, false on any error. */
export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  try {
    if (!(await isBiometricAvailable())) return false;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      // Unlock is a "biometric OR app-PIN" gate. The device passcode must NOT be
      // a fallback: it would bypass the app PIN and its 3-strikes wipe (the
      // weaker path a passcode-knowing attacker would take). A user whose
      // biometric fails simply types the app PIN on the lock screen behind this.
      disableDeviceFallback: true,
      cancelLabel: undefined,
    });
    return result.success;
  } catch {
    // Native module wedged / hardware error / cancelled mid-flight: fail closed.
    return false;
  }
}

/**
 * Cancel any in-flight biometric prompt (Android only; no-op elsewhere). Called
 * when the app backgrounds so a prompt that was dismissed by the OS can't leave
 * the native module wedged - which would make the next prompt a silent no-op.
 */
export async function cancelBiometric(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await LocalAuthentication.cancelAuthenticate();
  } catch {
    // nothing to cancel / unsupported - ignore
  }
}
