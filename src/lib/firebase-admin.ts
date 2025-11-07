import * as admin from 'firebase-admin';
import { connectToDatabase } from '@/lib/mongodb';
import Subscription from '@/models/Subscription';

// Initialize Firebase Admin SDK
let adminApp: admin.app.App;

function getAdminApp() {
  if (adminApp) return adminApp;

  try {
    // Check if already initialized
    if (admin.apps.length > 0 && admin.apps[0]) {
      adminApp = admin.apps[0];
      return adminApp;
    }

    // Initialize with service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccount) {
      console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found');
      return null;
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });

    return adminApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    return null;
  }
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, string>;
}

/**
 * Send Firebase notification to a specific user
 */
export async function sendFirebaseNotificationToUser(
  userId: string,
  payload: NotificationPayload
) {
  const app = getAdminApp();
  if (!app) {
    return { ok: false, reason: 'FIREBASE_ADMIN_NOT_INITIALIZED' };
  }

  try {
    await connectToDatabase();
    
    // Get all Firebase subscriptions for this user
    const subscriptions = await Subscription.find({ 
      user: userId, 
      type: 'firebase',
      fcmToken: { $exists: true }
    }).lean();

    if (subscriptions.length === 0) {
      return { ok: true, sent: 0, failed: 0, reason: 'NO_SUBSCRIPTIONS' };
    }

    const tokens = subscriptions.map(sub => sub.fcmToken).filter(Boolean) as string[];
    
    console.log(`📤 Sending Firebase notification to ${tokens.length} device(s)`);
    console.log(`📧 Title: "${payload.title}"`);
    console.log(`📝 Body: "${payload.body}"`);

    // Prepare the message
    const message: any = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
      tokens,
    };
    
    // Only add imageUrl if it's a valid URL
    if (payload.icon && (payload.icon.startsWith('http://') || payload.icon.startsWith('https://'))) {
      message.notification.imageUrl = payload.icon;
    }

    // Send to multiple devices
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`✅ Notification sent! Success: ${response.successCount}, Failed: ${response.failureCount}`);
    
    // Log detailed error information
    if (response.failureCount > 0) {
      console.error('❌ Failed to send to some devices:');
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`  Device ${idx}: ${resp.error?.code} - ${resp.error?.message}`);
        }
      });
    }

    // Handle failed tokens (remove invalid ones)
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && tokens[idx]) {
          failedTokens.push(tokens[idx]);
        }
      });

      // Remove invalid tokens from database
      if (failedTokens.length > 0) {
        await Subscription.deleteMany({ 
          fcmToken: { $in: failedTokens } 
        });
      }
    }

    return {
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error('Error sending Firebase notification:', error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Send Firebase notification to all users
 */
export async function broadcastFirebaseNotification(payload: NotificationPayload) {
  const app = getAdminApp();
  if (!app) {
    return { ok: false, reason: 'FIREBASE_ADMIN_NOT_INITIALIZED' };
  }

  try {
    await connectToDatabase();
    
    // Get all Firebase subscriptions
    const subscriptions = await Subscription.find({ 
      type: 'firebase',
      fcmToken: { $exists: true }
    }).lean();

    if (subscriptions.length === 0) {
      return { ok: true, sent: 0, failed: 0, reason: 'NO_SUBSCRIPTIONS' };
    }

    const tokens = subscriptions.map(sub => sub.fcmToken).filter(Boolean) as string[];

    // Firebase has a limit of 500 tokens per batch
    const batchSize = 500;
    let totalSent = 0;
    let totalFailed = 0;
    const failedTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);

      const message: any = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          url: payload.url || '/',
          ...payload.data,
        },
        tokens: batch,
      };
      
      // Only add imageUrl if it's a valid URL
      if (payload.icon && (payload.icon.startsWith('http://') || payload.icon.startsWith('https://'))) {
        message.notification.imageUrl = payload.icon;
      }

      const response = await admin.messaging().sendEachForMulticast(message);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      // Collect failed tokens
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && batch[idx]) {
          failedTokens.push(batch[idx]);
        }
      });
    }

    // Remove invalid tokens from database
    if (failedTokens.length > 0) {
      await Subscription.deleteMany({ 
        fcmToken: { $in: failedTokens } 
      });
    }

    return {
      ok: true,
      sent: totalSent,
      failed: totalFailed,
    };
  } catch (error) {
    console.error('Error broadcasting Firebase notification:', error);
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Send notification to a specific FCM token
 */
export async function sendToToken(token: string, payload: NotificationPayload) {
  const app = getAdminApp();
  if (!app) {
    return { ok: false, reason: 'FIREBASE_ADMIN_NOT_INITIALIZED' };
  }

  try {
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
      token,
    };

    await admin.messaging().send(message);
    return { ok: true };
  } catch (error) {
    console.error('Error sending to token:', error);
    return { ok: false, error: (error as Error).message };
  }
}
