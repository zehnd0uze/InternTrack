import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Take control immediately — ensures new SW activates right away
self.skipWaiting();
clientsClaim();

// Also handle explicit skip request from the app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Clean up old caches and precache new assets
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Handle Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'TernieTrack';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: data.icon || '/pwa-192x192.png',
      badge: '/badge.svg',
      data: data.url || '/'
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Error parsing push data', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
