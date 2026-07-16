module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Required by react-native-reanimated v4 (which @shopify/react-native-skia
      // depends on). MUST stay last in the plugins list.
      'react-native-worklets/plugin',
    ],
  };
};
