/**
 * Plugin to fix HMR WebSocket when Docusaurus is accessed through a proxy,
 * and suppress HMR errors when HMR fails to initialize.
 *
 * Issues addressed:
 * 1. WebSocket URL path when behind proxy (/docs/ws)
 * 2. HMR compatibility issues with Node.js 25+ and webpack 5.97.x
 */
const webpack = require('webpack');

module.exports = function webpackHmrFixPlugin() {
  return {
    name: 'webpack-hmr-fix',

    configureWebpack(config, isServer, utils) {
      if (isServer) {
        return {};
      }

      return {
        plugins: [
          // Replace webpack's hot modules with no-op versions when HMR isn't working
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
