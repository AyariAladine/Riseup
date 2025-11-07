import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Get Firebase messaging instance (only in browser)
export const getMessagingInstance = (): Messaging | null => {
  if (typeof window === 'undefined') return null;
  try {
    return getMessaging(app);
  } catch (error) {
    console.error('Error getting messaging instance:', error);
    return null;
  }
};

// Request notification permission and get FCM token
export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register Firebase messaging service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });
    
    // Wait for the service worker to be fully active
    await navigator.serviceWorker.ready;
    
    // Ensure the service worker is actually active before proceeding
    if (!registration.active) {
      // If not active yet, wait for it to activate
      await new Promise((resolve) => {
        if (registration.installing) {
          registration.installing.addEventListener('statechange', function() {
            if (this.state === 'activated') {
              resolve(undefined);
            }
          });
        } else if (registration.waiting) {
          registration.waiting.addEventListener('statechange', function() {
            if (this.state === 'activated') {
              resolve(undefined);
            }
          });
        } else {
          resolve(undefined);
        }
      });
    }
    
    console.log('Firebase Service Worker registered and active:', registration);

    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not found');
      return null;
    }

    // Get FCM token using the Firebase service worker registration
    const token = await getToken(messaging, { 
      vapidKey,
      serviceWorkerRegistration: registration 
    });
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages - setup the listener with a callback
export const setupMessageListener = (callback: (payload: any) => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.warn('Messaging not available, cannot setup listener');
    return () => {};
  }
  
  // onMessage returns an unsubscribe function
  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });
  
  return unsubscribe;
};

// Legacy promise-based listener (deprecated but kept for compatibility)
export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = getMessagingInstance();
    if (!messaging) return;
    
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });

export default app;
