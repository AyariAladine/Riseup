"use client";

import { useNotifications } from '@/hooks/useNotifications';

/**
 * Example component showing how to request notification permissions
 * Add this to your onboarding flow or settings page
 */
export function NotificationPermissionPrompt() {
  const { permission, isSupported, requestPermission } = useNotifications();

  if (!isSupported) {
    return null; // Browser doesn't support notifications
  }

  if (permission === 'granted') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800">✅ Notifications are enabled</p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">
          ❌ Notifications are blocked. Please enable them in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold mb-2">Enable Notifications</h3>
      <p className="text-sm text-gray-600 mb-3">
        Stay updated with important alerts and messages
      </p>
      <button
        onClick={requestPermission}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Enable Notifications
      </button>
    </div>
  );
}

/**
 * Example: Send notification button for admin/testing
 */
export function SendNotificationButton({ userId }: { userId?: string }) {
  const sendNotification = async () => {
    if (!userId) {
      alert('No user ID provided');
      return;
    }

    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title: 'Hello!',
        body: 'This is a test notification',
        url: '/dashboard',
      }),
    });

    const result = await response.json();
    if (result.success) {
      alert(`Notification sent! Delivered to ${result.sent} devices`);
    } else {
      alert(`Failed: ${result.error}`);
    }
  };

  return (
    <button
      onClick={sendNotification}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
    >
      Send Test Notification
    </button>
  );
}
