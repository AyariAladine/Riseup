import DashboardShell from '@/components/DashboardShell';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  );
}
