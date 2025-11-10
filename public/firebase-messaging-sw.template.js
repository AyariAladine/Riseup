// Firebase Cloud Messaging Service Worker TEMPLATE
// This is a template file that is safe to commit to Git
// The actual firebase-messaging-sw.js is auto-generated and gitignored
// 
// To generate the real file:
// - Run: npm run generate-firebase-sw
// - Or it auto-generates on: npm run dev / npm run build
//
// This file shows the structure but contains no real credentials

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration from environment variables
// These values are injected during build from NEXT_PUBLIC_FIREBASE_* env vars
const firebaseConfig = {
  "apiKey": "YOUR_API_KEY_HERE",
  "authDomain": "YOUR_PROJECT_ID.firebaseapp.com",
  "projectId": "YOUR_PROJECT_ID",
  "storageBucket": "YOUR_PROJECT_ID.appspot.com",
  "messagingSenderId": "YOUR_SENDER_ID",
  "appId": "YOUR_APP_ID"
};

// Check if Firebase config is valid before initializing
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  // Initialize Firebase in the service worker
  firebase.initializeApp(firebaseConfig);

  // Retrieve an instance of Firebase Messaging
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message',
      icon: payload.notification?.icon || '/144.png',
      badge: '/144.png',
      data: payload.data,
      tag: `notification-${Date.now()}`,
      requireInteraction: false,
      silent: false,
      vibrate: [200, 100, 200],
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Firebase config is incomplete. Push notifications will not work.');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
