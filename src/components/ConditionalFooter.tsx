"use client";

import { usePathname } from 'next/navigation';
import Footer from '@/components/Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on splash screen and root redirect page
  if (pathname === '/splash' || pathname === '/') {
    return null;
  }
  
  return <Footer />;
}
