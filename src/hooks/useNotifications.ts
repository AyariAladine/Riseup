"use client";

import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '@/lib/firebase';
import { toast } from 'sonner';

interface UseNotificationsReturn {
  permission: NotificationPermission;
  token: string | null;
  isSupported: boolean;
  requestPermission: () => Promise<void>;
  sendTestNotification: (title: string, body: string) => void;
}

/**
 * Hook to manage Firebase Cloud Messaging notifications
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { permission, token, requestPermission } = useNotifications();
 *   
 *   return (
 *     <div>
 *       {permission !== 'granted' && (
 *         <button onClick={requestPermission}>
 *           Enable Notifications
 *         </button>
 *       )}
 *       {token && <p>Your device is registered!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    // Listen for foreground messages
    const unsubscribe = onMessageListener()
      .then((payload: any) => {
        console.log('Received foreground notification:', payload);
        
        // Show toast notification
        toast(payload.notification?.title || 'New Notification', {
          description: payload.notification?.body,
          action: payload.data?.url ? {
            label: 'View',
            onClick: () => {
              window.location.href = payload.data.url;
            },
          } : undefined,
        });
      })
      .catch((err) => {
        console.error('Error listening for messages:', err);
      });

    return () => {
      // Cleanup if needed
    };
  }, [isSupported]);

  const requestPermission = async () => {
    try {
      const fcmToken = await requestNotificationPermission();
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');
        toast.success('Notifications enabled!');
      } else {
        setPermission('denied');
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const sendTestNotification = (title: string, body: string) => {
    if (permission !== 'granted') {
      toast.error('Notifications not enabled');
      return;
    }

    // Show a local notification for testing
    if ('Notification' in window) {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
      });
    }
  };

  return {
    permission,
    token,
    isSupported,
    requestPermission,
    sendTestNotification,
  };
}

/**
 * Hook to send notifications from client-side
 * Note: In production, sending should be done server-side for security
 * 
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { sendToUser, broadcast, loading } = useSendNotification();
 *   
 *   return (
 *     <button 
 *       onClick={() => broadcast('Hello!', 'Test message')}
 *       disabled={loading}
 *     >
 *       Send to All
 *     </button>
 *   );
 * }
 * ```
 */
export function useSendNotification() {
  const [loading, setLoading] = useState(false);

  const sendToUser = async (
    userId: string,
    title: string,
    body: string,
    url?: string,
    data?: Record<string, string>
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          body,
          url,
          data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notification sent!', {
          description: `Sent: ${result.sent}, Failed: ${result.failed}`,
        });
        return true;
      } else {
        toast.error('Failed to send notification', {
          description: result.error,
        });
        return false;
      }
    } catch (error) {
      toast.error('Error sending notification');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const broadcast = async (
    title: string,
    body: string,
    url?: string,
    data?: Record<string, string>
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broadcast: true,
          title,
          body,
          url,
          data,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Notification broadcast!', {
          description: `Sent: ${result.sent}, Failed: ${result.failed}`,
        });
        return true;
      } else {
        toast.error('Failed to broadcast notification', {
          description: result.error,
        });
        return false;
      }
    } catch (error) {
      toast.error('Error broadcasting notification');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendToUser,
    broadcast,
    loading,
  };
}
