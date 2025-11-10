#!/usr/bin/env node

/**
 * Generate Firebase Messaging Service Worker with environment variables
 * This script runs during build to inject Firebase config into the service worker
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Generate service worker content
const serviceWorkerContent = `// Firebase Cloud Messaging Service Worker
// This file is auto-generated during build from environment variables
// DO NOT EDIT MANUALLY - Regenerate using: npm run generate-firebase-sw

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration from environment variables
const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};

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
      tag: \`notification-\${Date.now()}\`,
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
`;

// Write to public directory
const outputPath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');
fs.writeFileSync(outputPath, serviceWorkerContent, 'utf8');

console.log('✅ Firebase Messaging Service Worker generated successfully!');
console.log(`📄 Output: ${outputPath}`);

// Validate config
if (!firebaseConfig.apiKey) {
  console.warn('⚠️  Warning: NEXT_PUBLIC_FIREBASE_API_KEY not found in environment variables');
  console.warn('   Push notifications will not work until Firebase is configured');
}
