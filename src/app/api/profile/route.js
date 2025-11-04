import 'server-only';
import { connectToDatabase } from '@/lib/mongodb';

import { ProfileUpdateSchema } from '@/features/profile/schemas';
import bcrypt from 'bcryptjs';


import { getUserFromRequest } from '@/lib/auth';
import nodemailer from 'nodemailer';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
    if (!user) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    return new Response(
      JSON.stringify({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '',
          isPremium: !!user.isPremium,
          preferences: user.preferences || { theme: 'system', emailNotifications: true },
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}

export async function PATCH(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ message: 'Validation error', errors: parsed.error.flatten() }), { status: 400 });
    const update = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name.trim();
    let passwordChanged = false;
    if (parsed.data.password !== undefined) {
      // require currentPassword to change password
      if (!parsed.data.currentPassword) return new Response(JSON.stringify({ message: 'Current password required' }), { status: 400 });
      const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
      if (!ok) return new Response(JSON.stringify({ message: 'Current password is incorrect' }), { status: 400 });
      update.password = await bcrypt.hash(parsed.data.password, 10);
      passwordChanged = true;
    }
    if (parsed.data.avatar !== undefined) update.avatar = parsed.data.avatar;
    if (parsed.data.preferences !== undefined) update.preferences = { ...user.preferences?.toObject?.() ?? user.preferences ?? {}, ...parsed.data.preferences };
    // Update user in Better Auth's user collection
    const db = await connectToDatabase();
    const userCollection = db.collection('user'); // Better Auth uses 'user' (singular)
    await userCollection.updateOne(
      { email: user.email },
      { $set: { ...update, updatedAt: new Date() } }
    );
    // Fetch updated user
    const updated = await userCollection.findOne({ email: user.email });
    // Send password change email if password was changed
    if (passwordChanged && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
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
          to: updated.email,
          subject: 'Your RiseUP password was changed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Password Changed</h2>
              <p>Hello ${updated.name || 'there'},</p>
              <p>Your password was just changed for your RiseUP account. If you did not make this change, please reset your password immediately or contact support.</p>
              <p style="margin-top: 32px; color: #888; font-size: 13px;">If this was you, you can safely ignore this email.</p>
            </div>
          `,
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('❌ Failed to send password change email:', emailError?.message || emailError);
      }
    }
    return new Response(
      JSON.stringify({
        user: {
          id: updated._id,
          name: updated.name,
          email: updated.email,
          avatar: updated.avatar || '',
          isPremium: !!updated.isPremium,
          preferences: updated.preferences || { theme: 'system', emailNotifications: true },
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}

