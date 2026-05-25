const searchParams = new URL(self.location.href).searchParams;

const firebaseConfig = {
  apiKey: searchParams.get('apiKey') || '',
  authDomain: searchParams.get('authDomain') || '',
  projectId: searchParams.get('projectId') || '',
  messagingSenderId: searchParams.get('messagingSenderId') || '',
  appId: searchParams.get('appId') || '',
  measurementId: searchParams.get('measurementId') || ''
};

if (
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
) {
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};
    const title = notification.title || data.title || 'Clinic notification';
    const body = notification.body || data.body || data.message || 'You have a new notification.';
    const navigateTo = data.navigate_to || data.navigateTo || '/';

    self.registration.showNotification(title, {
      body,
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-192x192.png',
      data: {
        navigateTo
      }
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const navigateTo = event.notification?.data?.navigateTo || '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && new URL(client.url).origin === self.location.origin) {
            await client.navigate(navigateTo);
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(navigateTo);
      }
      return undefined;
    })()
  );
});
