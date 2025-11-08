import DashboardShell from '@/components/DashboardShell';
import ProfilePreloader from '@/components/ProfilePreloader';

export const metadata = {
  title: 'Achievements - RiseUP',
};

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ProfilePreloader />
      {children}
    </DashboardShell>
  );
}
