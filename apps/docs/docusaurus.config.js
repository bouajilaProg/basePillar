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

  // OpenAPI plugin disabled due to SSG compatibility issues with Docusaurus 3.9.x
  // Re-enable when docusaurus-theme-openapi-docs fixes the Redux store SSG issue
  // See: https://github.com/PaloAltoNetworks/docusaurus-openapi-docs/issues
  plugins: [
    // [
    //   'docusaurus-plugin-openapi-docs',
    //   {
    //     id: 'api',
    //     docsPluginId: 'classic',
    //     config: {
    //       api: {
    //         specPath: 'openapi/openapi.json',
    //         outputDir: 'docs/api',
    //         sidebarOptions: {
    //           groupPathsBy: 'tag',
    //           categoryLinkSource: 'tag',
    //         },
    //       },
    //     },
    //   },
    // ],
  ],

  // themes: ['docusaurus-theme-openapi-docs'],

  themeConfig: {
    navbar: {
      title: 'BasePillar',
      items: [
        {
          type: 'doc',
          docId: 'intro',
          position: 'left',
          label: 'Overview',
        },
        {
          type: 'doc',
          docId: 'exploration/index',
          position: 'left',
          label: 'API',
        },
        {
          type: 'doc',
          docId: 'context/index',
          position: 'left',
          label: 'Context',
        },
        {
          type: 'doc',
          docId: 'observation/index',
          position: 'left',
          label: 'Observe',
        },
        {
          href: 'http://localhost:4000',
          label: 'Console',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Overview', to: '/' },
            { label: 'API Reference', to: '/exploration' },
            { label: 'System Context', to: '/context' },
          ],
        },
        {
          title: 'Developer',
          items: [
            { label: 'Live Console', href: 'http://localhost:4000' },
            { label: 'DB Studio', href: 'http://localhost:4983' },
          ],
        },
      ],
      copyright: `BasePillar ${new Date().getFullYear()}`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'sql'],
    },
  },
};

module.exports = config;
