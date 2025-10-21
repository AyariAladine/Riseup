import { serialize } from 'cookie';
import { connectToDatabase } from '@/lib/mongodb';
import RefreshToken from '@/models/RefreshToken';

function parseCookies(header) {
  return Object.fromEntries((header || '').split(';').map(c => c.trim().split('=')));
}

export async function POST(req) {
  const cookies = parseCookies(req.headers.get('cookie'));
  const refresh = cookies.refresh;

  try {
    await connectToDatabase();
  } catch (err) {
    console.error('Database connection error:', err?.message || err);
    return new Response(JSON.stringify({ message: 'Database not configured. Please set MONGODB_URI in your environment or .env.local' }), { status: 500 });
  }
  if (refresh) {
    const parts = refresh.split('.');
    if (parts.length === 2) {
      const [jti] = parts;
      await RefreshToken.findOneAndUpdate({ jti }, { revoked: true });
    }
  }

  const out = [];
  out.push(serialize('access', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 }));
  out.push(serialize('refresh', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 }));

  return new Response(JSON.stringify({ message: 'Logged out' }), { 
    status: 200, 
    headers: { 
      'Set-Cookie': out.join(','),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } 
  });
}
