import DashboardShell from '@/components/DashboardShell';
import ProfilePreloader from '@/components/ProfilePreloader';

export const metadata = {
  title: 'Dashboard - RiseUP',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ProfilePreloader />
      {children}
    </DashboardShell>
  );
}
