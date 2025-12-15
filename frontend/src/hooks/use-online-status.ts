import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

interface UseOnlineStatusOptions {
  userId?: string;
  autoUpdateStatus?: boolean;
  previousStatus?: string; // Status to restore when coming back online
}

export function useOnlineStatus(options?: UseOnlineStatusOptions) {
  const [isOnline, setIsOnline] = useState(true);
  const { userId, autoUpdateStatus = false, previousStatus } = options || {};

  const updateServerStatus = useCallback(async (status: 'online' | 'offline') => {
    if (!userId || !autoUpdateStatus) return;
    
    try {
      await api.updateUserStatus(userId, status);
      console.log(`Status updated to: ${status}`);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }, [userId, autoUpdateStatus]);

  useEffect(() => {
    // Set initial state
    const initialOnline = navigator.onLine;
    setIsOnline(initialOnline);

    // Handle online event
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Connection restored');
      // Restore previous status or default to 'online'
      if (autoUpdateStatus && userId) {
        updateServerStatus(previousStatus === 'offline' ? 'online' : (previousStatus as 'online' || 'online'));
      }
    };

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false);
      console.log('Connection lost');
      updateServerStatus('offline');
    };

    // Handle page unload/close - set to offline
    const handleBeforeUnload = () => {
      if (userId && autoUpdateStatus) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005'}/users/${userId}/status`;
        const body = JSON.stringify({ status: 'offline' });

        // Use keepalive fetch with PUT so backend accepts it (sendBeacon only supports POST)
        fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
          keepalive: true,
        }).catch(() => {
          // Ignore errors during unload
        });
      }
    };

    // Handle visibility change - mark away when tab hidden for >5 min
    let awayTimeout: NodeJS.Timeout | null = null;
    const handleVisibilityChange = () => {
      if (document.hidden && userId && autoUpdateStatus) {
        // Set to "away" after 5 minutes of inactivity
        awayTimeout = setTimeout(() => {
          updateServerStatus('offline');
        }, 5 * 60 * 1000);
      } else if (!document.hidden && awayTimeout) {
        clearTimeout(awayTimeout);
        awayTimeout = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (awayTimeout) clearTimeout(awayTimeout);
    };
  }, [userId, autoUpdateStatus, previousStatus, updateServerStatus]);

  return isOnline;
}
