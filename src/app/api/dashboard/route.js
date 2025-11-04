

import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { user } = await getUserFromRequest(req);
    if (!user) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    return new Response(
      JSON.stringify({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || ''
        }
      }),
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }
}
