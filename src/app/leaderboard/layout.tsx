import DashboardShell from '@/components/DashboardShell';
import ProfilePreloader from '@/components/ProfilePreloader';

export const metadata = {
  title: 'Leaderboard - RiseUP',
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <ProfilePreloader />
      {children}
    </DashboardShell>
  );
}
