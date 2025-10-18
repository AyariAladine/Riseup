import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

const ACCESS_SECRET = process.env.JWT_SECRET;

function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf('=');
        const name = idx > -1 ? c.slice(0, idx) : c;
        const val = idx > -1 ? c.slice(idx + 1) : '';
        return [name, decodeURIComponent(val)];
      })
  );
}

export async function getUserFromRequest(req) {
  const headerCookie = req.headers?.get?.('cookie');
  const cookies = parseCookies(headerCookie);
  let access = cookies.access;
  if (!access) {
    const auth = req.headers?.get?.('authorization') || req.headers?.get?.('Authorization');
    if (auth && String(auth).toLowerCase().startsWith('bearer ')) access = String(auth).slice(7).trim();
  }
  if (!access) throw new Error('NO_TOKEN');
  if (!ACCESS_SECRET) throw new Error('NO_JWT_SECRET');
  let decoded;
  try {
    decoded = jwt.verify(access, ACCESS_SECRET);
  } catch (err) {
    const e = new Error('INVALID_TOKEN');
    e.cause = err;
    throw e;
  }
  await connectToDatabase();
  const user = await User.findById(decoded.id).select('-password');
  if (!user) throw new Error('USER_NOT_FOUND');
  return { user, tokenPayload: decoded };
}

export function parseCookiesFromHeader(header) {
  return parseCookies(header ?? undefined);
}
