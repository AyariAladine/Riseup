import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import nodemailer from 'nodemailer';

const mongoClient = new MongoClient(process.env.MONGODB_URI as string);
const db = mongoClient.db("riseup");

export const auth = betterAuth({
    database: mongodbAdapter(db, {
        client: mongoClient
    }),
    baseURL: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    secret: process.env.NEXTAUTH_SECRET || process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true,
        async sendResetPassword({ user, url }) {
            // Send password reset email via Gmail SMTP (compatible with old implementation)
            if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
                console.error('Mail service not configured');
                return;
            }
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: user.email,
                subject: 'Password reset',
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6;">
                        <h2>Password reset</h2>
                        <p>Hi ${user.name},</p>
                        <p>We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
                        <p style="text-align:center;"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Reset password</a></p>
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `,
            };
            try {
                console.log('[BetterAuth] Sending password reset email to', user.email);
                await transporter.sendMail(mailOptions);
            } catch (err) {
                console.error('Mail error:', err);
                throw err;
            }
        },
    },
    events: {
    /**
     * @param {Object} param0
     * @param {any} param0.user - The user object
     * @param {string} [param0.provider] - The auth provider (e.g., 'google')
     */
    async sessionCreated({ user, provider }: { user: any, provider?: string }) {
        console.log('[BetterAuth] sessionCreated event fired', { user, provider });
            // Send login notification email
            if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
                try {
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: process.env.GMAIL_USER,
                            pass: process.env.GMAIL_PASS,
                        },
                    });
                    // Send welcome email on every Google sign-in
                    if (provider === 'google') {
                        const mailOptions = {
                            from: process.env.GMAIL_USER,
                            to: user.email,
                            subject: 'Welcome to RiseUP! 🎉',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #2563eb;">Congratulations, ${user.name || 'there'}! 🎉</h2>
                                    <p>Welcome to <strong>RiseUP</strong>. Your account is ready and you can start exploring all our features.</p>
                                    <p style="margin-top: 32px; color: #888; font-size: 13px;">If you did not sign up, you can ignore this email.</p>
                                </div>
                            `,
                        };
                        console.log('[BetterAuth] Sending Google welcome email to', user.email);
                        await transporter.sendMail(mailOptions);
                    }
                    // Always send login notification
                    const mailOptions = {
                        from: process.env.GMAIL_USER,
                        to: user.email,
                        subject: 'New login to your RiseUP account',
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                              <h2 style="color: #2563eb;">New Login Detected</h2>
                              <p>Hello ${user.name || 'there'},</p>
                              <p>Your RiseUP account was just accessed. If this was you, you can safely ignore this email.</p>
                              <p>If you did not log in, please reset your password immediately or contact support.</p>
                              <p style="margin-top: 32px; color: #888; font-size: 13px;">This is an automated security notification.</p>
                            </div>
                        `,
                    };
                    console.log('[BetterAuth] Sending login notification email to', user.email);
                    await transporter.sendMail(mailOptions);
                } catch (emailError) {
                    const msg = (emailError && typeof emailError === 'object' && 'message' in emailError) ? (emailError as any).message : String(emailError);
                    console.error('❌ Failed to send login notification email:', msg);
                }
            }
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        async sendVerificationEmail({ user, url }) {
            // Send welcome email after signup (compatible with old implementation)
            if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
                console.error('Mail service not configured');
                return;
            }
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: user.email,
                subject: 'Welcome to RiseUP! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Congratulations, ${user.name || 'there'}! 🎉</h2>
                        <p>Welcome to <strong>RiseUP</strong>. Your account is ready and you can start exploring all our features.</p>
                        <p style="margin-top: 16px;">Click the link below to verify your email:</p>
                        <p style="text-align:center;"><a href="${url}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a></p>
                        <p style="margin-top: 32px; color: #888; font-size: 13px;">If you did not sign up, you can ignore this email.</p>
                    </div>
                `,
            };
            
            try {
                console.log('[BetterAuth] Sending signup/verification email to', user.email);
                await transporter.sendMail(mailOptions);
            } catch (err) {
                console.error('Signup email error:', err);
            }
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days (matching old implementation)
        updateAge: 60 * 60 * 24, // Update session every day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 // Cache for 5 minutes
        }
    },
    rateLimit: {
        enabled: true,
        window: 60, // 60 seconds
        max: 30, // 30 requests per window (matching old rate limit)
    },
    plugins: [nextCookies()] // make sure this is the last plugin in the array
})

// Helper to get user from request headers - compatible with old API
export async function getUserFromRequest(req: Request) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session || !session.user) {
            throw new Error('NO_TOKEN');
        }

        // Fetch extra profile fields from your custom User collection
        const mongoose = await import('mongoose');
        const User = (await import('@/models/User')).default;
        let extraProfile = {};
        try {
            // Find by email (or id if you prefer)
            const dbUser = await User.findOne({ email: session.user.email }).lean();
            if (dbUser && typeof dbUser === 'object' && !Array.isArray(dbUser)) {
                // Exclude sensitive fields if present
                const { password, __v, ...rest } = dbUser as any;
                extraProfile = rest;
            } else if (dbUser) {
                extraProfile = { ...dbUser };
            }
        } catch (e) {
            console.error('Error fetching extra user profile:', e);
        }
        // Map 'image' to 'avatar' for compatibility
    // Use type assertions to access possibly missing fields
    let avatar = (session.user as any)?.avatar || (session.user as any)?.image || (extraProfile as any)?.avatar || '';
        return {
            user: {
                ...session.user,
                ...extraProfile,
                avatar,
                _id: session.user.id
            }
        };
    } catch (error) {
        console.error("Error getting user from request:", error);
        throw new Error('INVALID_TOKEN');
    }
}