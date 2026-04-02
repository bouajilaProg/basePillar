/**
 * Plugin to fix HMR WebSocket when Docusaurus is accessed through a proxy,
 * and suppress HMR errors when HMR fails to initialize.
 */
const webpack = require('webpack');

module.exports = function webpackHmrFixPlugin() {
  return {
    name: 'webpack-hmr-fix',

    configureWebpack(config, isServer) {
      if (isServer) {
        return {};
      }

      return {
        plugins: [
          new webpack.NormalModuleReplacementPlugin(
            /webpack\/hot\/dev-server\.js$/,
            require.resolve('./hmr-noop.js')
          ),
        ],
        devServer: {
          client: {
            webSocketURL: {
              hostname: '0.0.0.0',
              port: 0,
              pathname: '/docs/ws',
            },
            overlay: {
              errors: true,
              warnings: false,
              runtimeErrors: false,
            },
          },
        },
      };
    },
  };
};
