"use client";

import { useEffect } from 'react';
import { useProfile, useReclamations } from '@/lib/useProfile';

export default function ProfilePreloader() {
  // Simply calling these hooks will trigger the fetch and cache the data
  const { profile } = useProfile();
  const { reclamations } = useReclamations();

  // Prefetch on mount
  useEffect(() => {
    // Trigger a background fetch to ensure cache is populated
    if (!profile) {
      // Data is loading
    }
  }, [profile]);

  // This component doesn't render anything
  return null;
}
