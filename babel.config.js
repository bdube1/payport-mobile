module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo now handles the Reanimated plugin automatically as of
    // SDK 54 — specifying it manually here causes a "duplicate plugin" build error.
    presets: ['babel-preset-expo'],
  };
};
