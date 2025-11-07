/**
 * Helper functions for sending Firebase notifications for various user events
 */

import { sendFirebaseNotificationToUser } from './firebase-admin';

interface NotificationConfig {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a notification to a user
 */
export async function sendUserNotification(config: NotificationConfig) {
  try {
    await sendFirebaseNotificationToUser(config.userId, {
      title: config.title,
      body: config.body,
      icon: config.icon || '/icon.svg',
      url: config.url || '/dashboard',
    });
    console.log(`✅ Notification sent to user ${config.userId}: ${config.title}`);
  } catch (error) {
    console.error('❌ Failed to send notification:', error);
  }
}

/**
 * User became premium
 */
export async function notifyPremiumUpgrade(userId: string) {
  await sendUserNotification({
    userId,
    title: '🎉 Welcome to Premium!',
    body: 'You now have access to all premium features. Enjoy!',
    url: '/dashboard/premium',
  });
}

/**
 * Password reset requested
 */
export async function notifyPasswordReset(userId: string, email: string) {
  await sendUserNotification({
    userId,
    title: '🔐 Password Reset Requested',
    body: `A password reset link has been sent to ${email}. Check your email.`,
    url: '/dashboard',
  });
}

/**
 * Password successfully changed
 */
export async function notifyPasswordChanged(userId: string) {
  await sendUserNotification({
    userId,
    title: '✅ Password Changed',
    body: 'Your password has been successfully updated. If this wasn\'t you, contact support immediately.',
    url: '/dashboard/profile',
  });
}

/**
 * 2FA enabled
 */
export async function notify2FAEnabled(userId: string) {
  await sendUserNotification({
    userId,
    title: '🔒 Two-Factor Authentication Enabled',
    body: 'Your account is now more secure with 2FA enabled.',
    url: '/dashboard/profile',
  });
}

/**
 * 2FA disabled
 */
export async function notify2FADisabled(userId: string) {
  await sendUserNotification({
    userId,
    title: '⚠️ Two-Factor Authentication Disabled',
    body: 'Your 2FA has been disabled. Your account is less secure now.',
    url: '/dashboard/profile',
  });
}

/**
 * Face recognition enabled
 */
export async function notifyFaceRecognitionEnabled(userId: string) {
  await sendUserNotification({
    userId,
    title: '🎭 Face Recognition Enabled',
    body: 'Face recognition has been successfully set up for your account.',
    url: '/dashboard/profile',
  });
}

/**
 * Reclamation submitted
 */
export async function notifyReclamationSubmitted(userId: string, subject: string) {
  await sendUserNotification({
    userId,
    title: '📝 Reclamation Submitted',
    body: `Your reclamation "${subject}" has been submitted. We'll review it soon.`,
    url: '/dashboard',
  });
}

/**
 * Reclamation response received
 */
export async function notifyReclamationResponse(userId: string, subject: string) {
  await sendUserNotification({
    userId,
    title: '💬 Reclamation Response',
    body: `You have a new response to your reclamation "${subject}".`,
    url: '/dashboard',
  });
}

/**
 * New login detected
 */
export async function notifyNewLogin(userId: string, deviceInfo?: string) {
  await sendUserNotification({
    userId,
    title: '🔔 New Login Detected',
    body: deviceInfo 
      ? `New login from ${deviceInfo}. If this wasn't you, secure your account immediately.`
      : 'New login to your account detected. If this wasn\'t you, secure your account immediately.',
    url: '/dashboard/profile',
  });
}

/**
 * Account created/signed up
 */
export async function notifyAccountCreated(userId: string, name?: string) {
  await sendUserNotification({
    userId,
    title: '🎉 Welcome to RiseUp!',
    body: name 
      ? `Welcome ${name}! Your account has been created. Start exploring now!`
      : 'Your account has been created successfully. Start exploring now!',
    url: '/dashboard',
  });
}

/**
 * Logout notification (send before logout)
 */
export async function notifyLogout(userId: string) {
  await sendUserNotification({
    userId,
    title: '👋 Logged Out',
    body: 'You have been successfully logged out of your account.',
    url: '/auth/login',
  });
}

/**
 * Profile updated
 */
export async function notifyProfileUpdated(userId: string) {
  await sendUserNotification({
    userId,
    title: '✅ Profile Updated',
    body: 'Your profile has been updated successfully.',
    url: '/dashboard/profile',
  });
}

/**
 * Reclamation updated
 */
export async function notifyReclamationUpdated(userId: string, title: string) {
  await sendUserNotification({
    userId,
    title: '✏️ Reclamation Updated',
    body: `Your reclamation "${title}" has been updated successfully.`,
    url: '/dashboard/profile',
  });
}

/**
 * Reclamation deleted
 */
export async function notifyReclamationDeleted(userId: string) {
  await sendUserNotification({
    userId,
    title: '🗑️ Reclamation Deleted',
    body: 'Your reclamation has been deleted successfully.',
    url: '/dashboard/profile',
  });
}

/**
 * 2FA verification successful
 */
export async function notify2FAVerified(userId: string) {
  await sendUserNotification({
    userId,
    title: '✅ 2FA Verified',
    body: 'Two-factor authentication code verified successfully.',
    url: '/dashboard',
  });
}

/**
 * Login successful
 */
export async function notifyLoginSuccess(userId: string, name?: string) {
  await sendUserNotification({
    userId,
    title: '👋 Welcome Back!',
    body: name ? `Welcome back, ${name}!` : 'You have logged in successfully.',
    url: '/dashboard',
  });
}
