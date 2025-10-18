"use client";

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

export default function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header on splash screen and root redirect page
  if (pathname === '/splash' || pathname === '/') {
    return null;
  }
  
  return <Header />;
}
