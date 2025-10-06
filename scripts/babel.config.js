module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // any other plugins...
      "module-resolver", { alias: { "@": "./src" } },
      "expo-router/babel",
      'react-native-reanimated/plugin', // <= must be last
    ],
  };
};