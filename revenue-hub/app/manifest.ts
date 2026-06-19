import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tagett — Ecstasy Technologies',
    short_name: 'Tagett',
    description: 'AI operator tools for Ecstasy Technologies, Ghana',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0D',
    theme_color: '#0B0B0D',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
