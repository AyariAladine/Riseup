import Sidebar from './Sidebar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebar />
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
