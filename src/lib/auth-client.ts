import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [twoFactorClient()]
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgetPassword,
  resetPassword,
  changePassword,
  updateUser,
  twoFactor,
} = authClient;

// Helper function to check if email exists (custom endpoint)
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check-email-exists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    return data.exists || false;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}