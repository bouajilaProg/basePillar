const config = {
  title: 'BasePillar Docs',
  tagline: 'API and platform documentation',
  url: 'http://localhost',
  baseUrl: '/docs/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',

  organizationName: 'basepillar',
  projectName: 'basepillar',

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: undefined,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  plugins: [require.resolve('./plugins/webpack-hmr-fix')],

  themeConfig: {
    navbar: {
      title: 'BasePillar',
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Docs',
        },
        {
          href: '/docs/api',
          label: 'API',
          position: 'left',
        },
      ],
    },
  },
};

module.exports = config;
