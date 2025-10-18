"use client";

import Sidebar from './Sidebar';
import { useEffect, useState } from 'react';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMainClick = () => {
    if (mounted && document.body.hasAttribute('data-drawer')) {
      document.body.removeAttribute('data-drawer');
    }
  };

  return (
    <div>
      <Sidebar />
      <main className="dashboard-main" onClick={handleMainClick}>{children}</main>
    </div>
  );
}
