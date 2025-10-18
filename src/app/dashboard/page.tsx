import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function Page() {
  const headersList = await headers();
  const cookie = headersList.get('cookie') || '';

  let initialUser: { id: string; email: string; name?: string; avatar?: string } | null = null;

  try {
  const forwardedHost = headersList.get('x-forwarded-host');
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host');
    const baseUrl = forwardedHost ? `${proto}://${forwardedHost}` : `http://${host}`;

    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      initialUser = data.user || null;
    } else if (res.status === 401) {
      redirect('/auth/login');
    }
  } catch {
    // Ignore server-side fetch errors; the client will handle auth redirect
  }

  return <DashboardClient initialUser={initialUser} />;
}
