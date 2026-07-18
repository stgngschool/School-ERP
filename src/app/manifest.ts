import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'St. GNG School - Finance OS',
    short_name: 'GNG School',
    description: 'School Management & Finance OS Portal for Admins, Accountants, Teachers, and Parents',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    orientation: 'portrait-primary',
    lang: 'en-IN',
    dir: 'ltr',
    categories: ['education', 'finance', 'productivity'],
    icons: [
      {
        src: '/logo.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Collect Fee',
        short_name: 'Collect',
        description: 'Quickly collect student fees',
        url: '/?tab=collect',
        icons: [{ src: '/logo.png', sizes: '96x96' }],
      },
      {
        name: 'Mark Attendance',
        short_name: 'Attendance',
        description: 'Mark daily attendance',
        url: '/?tab=attendance',
        icons: [{ src: '/logo.png', sizes: '96x96' }],
      },
    ],
  };
}
