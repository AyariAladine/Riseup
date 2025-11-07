"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function NotificationTestPage() {
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from RiseUp!');
  const [url, setUrl] = useState('/dashboard');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fetch current user ID
  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.user?.id) {
          setUserId(data.user.id);
          console.log('Current user ID:', data.user.id);
        }
      })
      .catch(err => console.error('Failed to fetch user:', err));
  }, []);

  const sendNotification = async (broadcast = false) => {
    setLoading(true);
    try {
      const payload = {
        title,
        body,
        url,
        userId: broadcast ? undefined : userId,
        broadcast,
      };
      
      console.log('Sending notification:', payload);
      
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      console.log('Response:', data);

      if (data.success) {
        toast.success('Notification sent!', {
          description: `Sent: ${data.sent}, Failed: ${data.failed}${data.reason ? ` (${data.reason})` : ''}`,
        });
      } else {
        toast.error('Failed to send notification', {
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Error', {
        description: 'Failed to send notification',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Firebase Notification Tester</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Send test notifications to users or broadcast to all
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              Notification Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter notification title"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="body" className="block text-sm font-medium">
              Notification Body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter notification message"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="url" className="block text-sm font-medium">
              Target URL (optional)
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/dashboard"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="userId" className="block text-sm font-medium">
              User ID (for targeted notifications)
            </label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => sendNotification(false)}
              disabled={loading || !userId}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Send to User
            </button>
            <button
              onClick={() => sendNotification(true)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Broadcast to All
            </button>
          </div>

          <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Make sure Firebase is configured in your .env.local</li>
              <li>Allow notifications when prompted by your browser</li>
              <li>Enter a user ID or leave blank for broadcast</li>
              <li>Click "Send to User" or "Broadcast to All"</li>
              <li>Check your notifications!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
