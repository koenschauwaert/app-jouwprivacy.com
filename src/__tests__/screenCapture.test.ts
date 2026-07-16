// SPDX-License-Identifier: Apache-2.0
import { renderHook } from '@testing-library/react-native';
import * as ScreenCapture from 'expo-screen-capture';

import { useScreenCaptureProtection } from '@/security/screenCapture';

beforeEach(() => jest.clearAllMocks());

describe('useScreenCaptureProtection', () => {
  it('prevents screen capture on mount', () => {
    renderHook(() => useScreenCaptureProtection());
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it('re-allows screen capture on unmount', () => {
    const { unmount } = renderHook(() => useScreenCaptureProtection());
    expect(ScreenCapture.allowScreenCaptureAsync).not.toHaveBeenCalled();
    unmount();
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });
});
