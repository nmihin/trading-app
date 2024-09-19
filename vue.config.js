const CompressionPlugin = require('compression-webpack-plugin');

module.exports = {
  transpileDependencies: [
    'vue-router' // Example dependency that might need to be transpiled
  ],
  configureWebpack: {
    plugins: [
      new CompressionPlugin({
        test: /\.html$/,
        filename: '[path].gz[query]',
        algorithm: 'gzip',
        threshold: 10240,
        minRatio: 0.8,
      }),
    ],
  },
};
