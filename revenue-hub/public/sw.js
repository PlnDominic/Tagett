// Take control as soon as possible. On iOS a service worker that stays in the
// "waiting" state never controls the page, so the push subscription attaches to
// a worker that isn't active and the first notifications get dropped. Claiming
// on install/activate makes this worker the controller immediately.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Minimal fetch pass-through — keeps the SW active so push events fire on iOS
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  // iOS enforces userVisibleOnly: every push MUST show a notification, or after
  // a few misses it silently unsubscribes the device. Apple also sends pushes
  // with an empty or non-JSON payload, so parsing must never throw — fall back
  // to a default notification instead of letting the handler abort.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    try {
      data = { body: event.data ? event.data.text() : '' }
    } catch {
      data = {}
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Tagett', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'tagett',
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data?.url ?? '/')
    })
  )
})
