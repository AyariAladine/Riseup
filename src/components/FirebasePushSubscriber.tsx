"use client";
import { useEffect, useState, useRef } from 'react';
import { useUser } from '@/lib/user-client';
import { requestNotificationPermission, setupMessageListener } from '@/lib/firebase';

export default function FirebasePushSubscriber() {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { user } = useUser();
  const hasSubscribed = useRef(false); // Prevent multiple subscriptions

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
    }
  }, []);

  useEffect(() => {
    // Prevent multiple subscriptions
    if (!isSupported || !user || hasSubscribed.current) return;

    const setupNotifications = async () => {
      try {
        // Request permission and get FCM token
        const fcmToken = await requestNotificationPermission();
        
        if (fcmToken) {
          setToken(fcmToken);
          hasSubscribed.current = true; // Mark as subscribed
          
          // Save token to backend
          const u = user as unknown as Record<string, unknown> | null;
          const userId = u?.id || u?._id || null;
          
          await fetch('/api/push/firebase-subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: fcmToken, 
              userId 
            }),
          });

          console.log('✅ Firebase notifications enabled');
        }
      } catch (error: any) {
        // Only log error if it's not about missing Firebase config (expected in dev)
        if (!error?.message?.includes('Firebase configuration') && 
            !error?.message?.includes('API key not valid')) {
          console.error('❌ Error setting up notifications:', error);
        }
      }
    };

    setupNotifications();
  }, [isSupported, user]);

  // Listen for foreground messages - only show when app is in focus
  useEffect(() => {
    if (!token) return;

    console.log('🔔 Setting up foreground message listener');

    const unsubscribe = setupMessageListener((payload: any) => {
      console.log('📬 Received foreground message:', payload);
      
      // Only show notification if document is visible (app is in focus)
      // When app is in background, Firebase service worker handles it automatically
      if (document.visibilityState === 'visible') {
        if ('Notification' in window && Notification.permission === 'granted') {
          const notificationTitle = payload.notification?.title || 'New Notification';
          const notificationOptions = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/icon.svg',
            badge: '/icon.svg',
            tag: `notification-${Date.now()}`, // Unique tag so multiple notifications show
            requireInteraction: false,
            data: payload.data,
          };
          
          // Use service worker to show notification for consistency
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(notificationTitle, notificationOptions);
            }).catch((err) => {
              console.error('Failed to show notification via SW:', err);
              // Fallback to browser notification API
              const notification = new Notification(notificationTitle, notificationOptions);
              notification.onclick = () => {
                if (payload.data?.url) {
                  window.focus();
                  window.location.href = payload.data.url;
                }
                notification.close();
              };
            });
          } else {
            // Fallback to browser notification API
            const notification = new Notification(notificationTitle, notificationOptions);
            notification.onclick = () => {
              if (payload.data?.url) {
                window.focus();
                window.location.href = payload.data.url;
              }
              notification.close();
            };
          }
        }
      } else {
        console.log('App not visible, letting service worker handle notification');
      }
    });

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [token]);

  return null; // This component doesn't render anything
}
