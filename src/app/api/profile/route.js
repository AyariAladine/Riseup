import 'server-only';
import { getUserFromRequest } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { ProfileUpdateSchema } from '@/features/profile/schemas';
import bcrypt from 'bcryptjs';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
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
    console.error(err);
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
    if (parsed.data.password !== undefined) {
      // require currentPassword to change password
      if (!parsed.data.currentPassword) return new Response(JSON.stringify({ message: 'Current password required' }), { status: 400 });
      const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
      if (!ok) return new Response(JSON.stringify({ message: 'Current password is incorrect' }), { status: 400 });
      update.password = await bcrypt.hash(parsed.data.password, 10);
    }
    if (parsed.data.avatar !== undefined) update.avatar = parsed.data.avatar;
    if (parsed.data.preferences !== undefined) update.preferences = { ...user.preferences?.toObject?.() ?? user.preferences ?? {}, ...parsed.data.preferences };
    const updated = await User.findByIdAndUpdate(user._id, update, { new: true });
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

// start email change: send verification link
// email change flow moved to /api/profile/email/start and /api/profile/email/confirm

