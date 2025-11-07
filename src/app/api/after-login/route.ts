import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import nodemailer from 'nodemailer';
import { notifyNewLogin } from '@/lib/notification-helper';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get device info from request headers
    const userAgent = req.headers.get('user-agent') || 'Unknown device';
    const deviceInfo = userAgent.includes('Mobile') ? 'Mobile device' : 'Desktop/Laptop';

    // Send Firebase push notification for new login
    try {
      await notifyNewLogin(user.id, deviceInfo);
      console.log(`✅ Login notification sent to user ${user.id}`);
    } catch (notifError) {
      console.error('Failed to send login notification:', notifError);
      // Don't fail the whole request if notification fails
    }

    // Send welcome email (optional - only if configured)
    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
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
              <p style="margin-top: 32px; color: #888; font-size: 13px;">If you did not sign up, you can ignore this email.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the whole request if email fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error in after-login:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
