// GitHub Pages config: set via env or default to local dev
const isGHPages = process.env.DEPLOY_TARGET === 'gh-pages';
const ghOrg = process.env.GH_ORG || 'basepillar';
const ghRepo = process.env.GH_REPO || 'basepillar';

const config = {
  title: 'BasePillar Docs',
  tagline: 'API and platform documentation',
  url: isGHPages ? `https://${ghOrg}.github.io` : 'http://localhost',
  baseUrl: isGHPages ? `/${ghRepo}/` : '/docs/',
  trailingSlash: false,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',

  organizationName: ghOrg,
  projectName: ghRepo,

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
          type: 'doc',
          docId: 'console',
          position: 'left',
          label: 'Console',
        },
        {
          href: 'http://localhost:3000/api/docs',
          label: 'API (local)',
          position: 'left',
        },
      ],
    },
  },
};

module.exports = config;
