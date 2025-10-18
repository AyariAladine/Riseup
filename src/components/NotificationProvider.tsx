'use client';

import { useEffect, useState } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  header?: string;
};

let notificationListeners: ((notification: Notification) => void)[] = [];

export function showNotification(message: string, type: NotificationType = 'success', header?: string) {
  const notification: Notification = {
    id: Math.random().toString(36).substring(7),
    message,
    type,
    header,
  };
  
  notificationListeners.forEach(listener => listener(notification));
}

export default function NotificationProvider() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const listener = (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 4000);
    };

    notificationListeners.push(listener);

    return () => {
      notificationListeners = notificationListeners.filter(l => l !== listener);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getColors = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'linear-gradient(135deg, rgba(16, 30, 40, 0.98) 0%, rgba(20, 40, 50, 0.98) 100%)',
          border: '1px solid rgba(100, 200, 255, 0.3)',
          color: '#64c8ff',
          glow: 'rgba(100, 200, 255, 0.5)',
        };
      case 'error':
        return {
          bg: 'linear-gradient(135deg, rgba(40, 16, 16, 0.98) 0%, rgba(50, 20, 20, 0.98) 100%)',
          border: '1px solid rgba(255, 100, 100, 0.3)',
          color: '#ff6464',
          glow: 'rgba(255, 100, 100, 0.5)',
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, rgba(40, 30, 16, 0.98) 0%, rgba(50, 40, 20, 0.98) 100%)',
          border: '1px solid rgba(255, 200, 100, 0.3)',
          color: '#ffc864',
          glow: 'rgba(255, 200, 100, 0.5)',
        };
      case 'info':
        return {
          bg: 'linear-gradient(135deg, rgba(16, 30, 40, 0.98) 0%, rgba(20, 35, 50, 0.98) 100%)',
          border: '1px solid rgba(100, 150, 255, 0.3)',
          color: '#6496ff',
          glow: 'rgba(100, 150, 255, 0.5)',
        };
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px',
    }}>
      {notifications.map(notification => {
        const colors = getColors(notification.type);
        const isSuccess = notification.type === 'success';
        
        return (
          <div
            key={notification.id}
            style={{
              background: colors.bg,
              border: colors.border,
              borderRadius: '4px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              boxShadow: `0 8px 32px ${colors.glow}, 0 2px 8px rgba(0, 0, 0, 0.6)`,
              animation: 'steamSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => removeNotification(notification.id)}
          >
            {/* Glow effect bar on left */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: colors.color,
              boxShadow: `0 0 10px ${colors.glow}`,
            }} />
            
            {/* Icon with glow */}
            <div style={{ 
              color: colors.color, 
              flexShrink: 0,
              filter: `drop-shadow(0 0 8px ${colors.glow})`,
              marginLeft: '8px',
            }}>
              {isSuccess ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                getIcon(notification.type)
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              {notification.header && (
                <div style={{ 
                  fontSize: '11px', 
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  color: colors.color,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  textShadow: `0 0 8px ${colors.glow}`,
                }}>
                  {notification.header}
                </div>
              )}
              <div style={{ 
                fontSize: '14px', 
                lineHeight: 1.4,
                color: '#ffffff',
                fontWeight: 500,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
              }}>
                {notification.message}
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(notification.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        );
      })}
      
      <style jsx>{`
        @keyframes steamSlideIn {
          0% {
            transform: translateX(400px) scale(0.8);
            opacity: 0;
          }
          60% {
            transform: translateX(-10px) scale(1.02);
            opacity: 1;
          }
          80% {
            transform: translateX(5px) scale(0.98);
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
