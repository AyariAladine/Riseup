/**
 * Helper functions for sending Firebase notifications for various user events
 * with rate limiting to prevent notification spam
 */

import { sendFirebaseNotificationToUser } from './firebase-admin';

interface NotificationConfig {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// Rate limiting: Track last notification time per user per notification type
// Format: "userId:notificationType" -> timestamp
const lastNotificationTime = new Map<string, number>();

// Minimum time between notifications of the same type for the same user (in ms)
const RATE_LIMIT_MS = 60 * 1000; // 1 minute

/**
 * Check if enough time has passed since last notification
 */
function canSendNotification(userId: string, notificationType: string): boolean {
  const key = `${userId}:${notificationType}`;
  const lastTime = lastNotificationTime.get(key);
  const now = Date.now();
  
  if (!lastTime || (now - lastTime) >= RATE_LIMIT_MS) {
    lastNotificationTime.set(key, now);
    return true;
  }
  
  console.log(`⏸️ Rate limit: Skipping ${notificationType} notification for user ${userId} (last sent ${Math.round((now - lastTime) / 1000)}s ago)`);
  return false;
}

/**
 * Send a notification to a user (with rate limiting)
 */
export async function sendUserNotification(config: NotificationConfig, notificationType: string = 'generic') {
  // Check rate limit
  if (!canSendNotification(config.userId, notificationType)) {
    return;
  }
  
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
  }, 'premium-upgrade');
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
  }, 'password-reset');
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
  }, 'password-changed');
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
  }, '2fa-enabled');
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
  }, '2fa-disabled');
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
  }, 'face-recognition-enabled');
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
  }, 'reclamation-submitted');
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
  }, 'reclamation-response');
}

/**
 * New login detected (rate limited to prevent spam on multiple logins)
 */
export async function notifyNewLogin(userId: string, deviceInfo?: string) {
  await sendUserNotification({
    userId,
    title: '👋 Welcome to RiseUp!',
    body: deviceInfo 
      ? `Welcome back! Login from ${deviceInfo}.`
      : 'Welcome back to RiseUp!',
    url: '/dashboard',
  }, 'login');
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
  }, 'account-created');
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
  }, 'logout');
}

/**
 * Profile updated (rate limited to prevent spam on multiple updates)
 */
export async function notifyProfileUpdated(userId: string) {
  await sendUserNotification({
    userId,
    title: '✅ Profile Updated',
    body: 'Your profile has been updated successfully.',
    url: '/dashboard/profile',
  }, 'profile-updated');
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
  }, 'reclamation-updated');
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
  }, 'reclamation-deleted');
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
  }, '2fa-verified');
}

/**
 * Login successful (welcome back message - rate limited)
 */
export async function notifyLoginSuccess(userId: string, name?: string) {
  await sendUserNotification({
    userId,
    title: '👋 Welcome Back!',
    body: name ? `Welcome back, ${name}!` : 'You have logged in successfully.',
    url: '/dashboard',
  }, 'login-success');
}

/**
 * Task completed
 */
export async function notifyTaskCompleted(userId: string, taskTitle: string) {
  await sendUserNotification({
    userId,
    title: '🎉 Task Completed!',
    body: `Great job! You completed "${taskTitle}".`,
    url: '/dashboard/tasks',
  }, 'task-completed');
}

/**
 * New task assigned
 */
export async function notifyNewTask(userId: string, taskTitle: string) {
  await sendUserNotification({
    userId,
    title: '📋 New Task Assigned',
    body: `You have a new task: "${taskTitle}".`,
    url: '/dashboard/tasks',
  }, 'new-task');
}

/**
 * Achievement unlocked
 */
export async function notifyAchievementUnlocked(userId: string, achievementName: string, badgeType?: string) {
  const emoji = badgeType === 'Diamond' ? '💎' : badgeType === 'Gold' ? '🥇' : badgeType === 'Silver' ? '🥈' : '🥉';
  await sendUserNotification({
    userId,
    title: `${emoji} Achievement Unlocked!`,
    body: `Congratulations! You earned "${achievementName}".`,
    url: '/dashboard/profile',
  }, 'achievement-unlocked');
}

/**
 * Premium subscription activated
 */
export async function notifyPremiumActivated(userId: string) {
  await sendUserNotification({
    userId,
    title: '💎 Premium Activated!',
    body: 'Welcome to Premium! You now have access to all exclusive features.',
    url: '/dashboard',
  }, 'premium-activated');
}

/**
 * NFT badge minted on Hedera
 */
export async function notifyNFTMinted(userId: string, badgeName: string, badgeTier: string) {
  const emoji = badgeTier === 'Diamond' ? '💎' : badgeTier === 'Gold' ? '🥇' : badgeTier === 'Silver' ? '🥈' : '🥉';
  await sendUserNotification({
    userId,
    title: `${emoji} NFT Badge Minted!`,
    body: `Your "${badgeName}" achievement has been minted as an NFT on Hedera blockchain!`,
    url: '/dashboard/profile',
  }, 'nft-minted');
}
