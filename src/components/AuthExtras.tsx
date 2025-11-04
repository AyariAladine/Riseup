"use client";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// This component renders any client-only UI (e.g., social login, extra buttons, etc.)
export default function AuthExtras() {
  const router = useRouter();
  
  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      router.push("/dashboard");
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <div style={{ marginTop: 12, textAlign: "center" }}>
      <button
        className="btn btn-ghost"
        style={{ marginRight: 8 }}
        onClick={handleGoogleSignIn}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" style={{ verticalAlign: 'middle', marginRight: 8 }}><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.13 30.18 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.2C12.13 13.13 17.61 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.93 37.13 46.1 31.36 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.9 15.18 0 19.47 0 24c0 4.53.9 8.82 2.69 12.24l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.18 0 11.64-2.03 15.85-5.53l-7.19-5.59c-2.01 1.35-4.59 2.13-8.66 2.13-6.39 0-11.87-3.63-14.33-8.79l-7.98 6.2C6.71 42.18 14.82 48 24 48z"/></g></svg>
        Continue with Google
      </button>
    </div>
  );
}
