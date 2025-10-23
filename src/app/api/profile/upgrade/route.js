import { NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import nodemailer from 'nodemailer';


export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { user } = await getUserFromRequest(req);
    await connectToDatabase();

    // Update isPremium in MongoDB directly
    const db = await connectToDatabase();
    const usersCollection = db.collection('users');
    const result = await usersCollection.updateOne(
      { email: user.email },
      { $set: { isPremium: true } }
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Send premium confirmation email to user
    try {
      if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
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
          subject: '🎉 You are now a RiseUP Premium Member!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Congratulations, ${user.name || 'there'}! 🎉</h2>
              <p>Thank you for upgrading to <strong>RiseUP Premium</strong>! You now have access to all premium features and priority support.</p>
              <ul>
                <li>⭐ Unlimited access to all features</li>
                <li>🚀 Priority support</li>
                <li>🔒 Early access to new tools</li>
              </ul>
              <p>If you have any questions, just reply to this email.</p>
              <p style="margin-top: 32px; color: #888; font-size: 13px;">Thank you for supporting RiseUP!</p>
            </div>
          `,
        };
        await transporter.sendMail(mailOptions);
      }
    } catch (emailError) {
      console.error('❌ Failed to send premium email:', emailError?.message || emailError);
    }
    return NextResponse.json({ success: true, isPremium: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
