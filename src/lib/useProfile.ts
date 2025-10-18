import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => {
  // 401 is expected when not logged in, don't throw error
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

export type ProfileData = {
  user: {
    name: string;
    email: string;
    avatar?: string;
    isPremium?: boolean;
    preferences?: {
      theme?: 'system' | 'light' | 'dark';
      emailNotifications?: boolean;
      isOnline?: boolean;
    };
  };
};

export type ReclamationsData = {
  reclamations: Array<{
    _id: string;
    title: string;
    description: string;
    status: 'pending' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    category: 'bug' | 'feature-request' | 'support' | 'billing' | 'other';
    adminNotes?: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<ProfileData>('/api/profile', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 300000, // 5 minutes
    // Keep data fresh for 5 minutes without revalidating
    refreshInterval: 0,
  });

  return {
    profile: data?.user,
    isLoading,
    isError: error,
    mutate, // Use this to manually refresh the data
  };
}

export function useReclamations() {
  const { data, error, isLoading, mutate } = useSWR<ReclamationsData>('/api/reclamations', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 180000, // 3 minutes
    refreshInterval: 0,
  });

  return {
    reclamations: data?.reclamations || [],
    isLoading,
    isError: error,
    mutate, // Use this to manually refresh the data
  };
}
