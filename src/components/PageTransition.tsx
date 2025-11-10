"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);

  useEffect(() => {
    // Start transition
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      setDisplayChildren(children);
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div className={`page-transition-wrapper ${isTransitioning ? 'transitioning' : ''}`}>
      {displayChildren}
    </div>
  );
}
