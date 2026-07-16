/* Global test mocks for native modules. Loaded via jest setupFilesAfterEnv. */

// expo-blur native views: passthrough Views so GlassCard renders in tests.
jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style }) => React.createElement(View, { style }, children),
    BlurTargetView: ({ children, style }) => React.createElement(View, { style }, children),
  };
});

// iOS native liquid-glass view: passthrough View + the enums GlassCard maps to.
jest.mock('expo-liquid-glass-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ExpoLiquidGlassView: ({ children, style }) => React.createElement(View, { style }, children),
    LiquidGlassType: {
      Clear: 'clear',
      Tint: 'tint',
      Regular: 'regular',
      Interactive: 'interactive',
      Identity: 'identity',
    },
    CornerStyle: { Continuous: 'continuous', Circular: 'circular' },
  };
});

// In-memory secure store. Exposes __store so tests can reset/inspect it.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __store: store,
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

// expo-crypto: back it with Node's crypto so the PIN salted-hash path runs for
// real (deterministic, no native bridge) in tests.
jest.mock('expo-crypto', () => {
  const nodeCrypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomBytes: (n) => Uint8Array.from(nodeCrypto.randomBytes(n)),
    digestStringAsync: async (_algo, data) =>
      nodeCrypto.createHash('sha256').update(data).digest('hex'),
  };
});

// Screen-capture protection: no-op native calls in tests.
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => {}),
  allowScreenCaptureAsync: jest.fn(async () => {}),
  addScreenshotListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Biometrics available + succeeding by default; tests override per case.
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
}));

// Safe-area context: passthrough mock so sheets/screens render in tests.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaConsumer: ({ children }) => children(inset),
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    SafeAreaInsetsContext: React.createContext(inset),
  };
});
