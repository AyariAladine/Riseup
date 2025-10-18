import { cookies } from 'next/headers';
import SplashClient from '@/app/splash/SplashClient';

export default async function SplashPage() {
  const c = await cookies();
  const hasAccess = Boolean(c.get('access')?.value);
  const target = hasAccess ? '/dashboard' : '/auth/login';
  return <SplashClient target={target} />;
}
