import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/docs/',
    component: ComponentCreator('/docs/', '92e'),
    routes: [
      {
        path: '/docs/',
        component: ComponentCreator('/docs/', 'dd3'),
        routes: [
          {
            path: '/docs/',
            component: ComponentCreator('/docs/', '619'),
            routes: [
              {
                path: '/docs/',
                component: ComponentCreator('/docs/', 'be8'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
