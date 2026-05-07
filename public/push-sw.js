/* EGL EYE — Push notification service worker
 * Scope: dedicated to web push only. Does NOT cache HTML / app shell,
 * so it cannot serve a stale build to the preview iframe.
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Show a notification when the server pushes a payload.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: 'EGL EYE', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'EGL EYE — Insurance Update';
  const options = {
    body: payload.body || '',
    icon: payload.icon || 'https://storage.googleapis.com/gpt-engineer-file-uploads/7a3ckCG7l6ZbaVHLuKN310Jy1c22/uploads/1769094736149-favicon.ico',
    badge: payload.badge || 'https://storage.googleapis.com/gpt-engineer-file-uploads/7a3ckCG7l6ZbaVHLuKN310Jy1c22/uploads/1769094736149-favicon.ico',
    image: payload.image || undefined,
    tag: payload.tag || 'egl-eye-news',
    renotify: true,
    requireInteraction: false,
    data: {
      articleId: payload.articleId || null,
      portalUrl: payload.portalUrl || '/',
      sourceUrl: payload.sourceUrl || null,
    },
    actions: [
      { action: 'open-portal', title: 'Read in portal' },
      ...(payload.sourceUrl ? [{ action: 'open-source', title: 'Open source' }] : []),
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle clicks on the notification or its action buttons.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  let targetUrl = data.portalUrl || '/';
  if (action === 'open-source' && data.sourceUrl) {
    targetUrl = data.sourceUrl;
  } else if (data.articleId) {
    // Deep link the portal so it auto-opens the reader modal.
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}article=${encodeURIComponent(data.articleId)}`;
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Reuse an existing tab if possible
      for (const client of allClients) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin && action !== 'open-source') {
            await client.focus();
            client.postMessage({
              type: 'OPEN_ARTICLE',
              articleId: data.articleId,
              sourceUrl: data.sourceUrl,
            });
            return;
          }
        } catch (_e) {
          /* ignore */
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
