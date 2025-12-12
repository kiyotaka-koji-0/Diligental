'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    // Check if running in browser
    if (typeof window === 'undefined') return;

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.log('Service Workers not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        console.log('Service Worker registered:', registration);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for controller change (new service worker activated)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          
          // Optionally notify user about update
          console.log('Service Worker updated');
          
          // You could show a notification here
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Diligental Updated', {
              body: 'A new version is available. Please refresh to get the latest features.',
              tag: 'app-update',
              requireInteraction: false,
            });
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    };

    // Wait for window to fully load before registering
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', registerServiceWorker);
    } else {
      registerServiceWorker();
    }

    // Request notification permission for PWA features
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        console.log('Notification permission denied');
      });
    }

  }, []);

  return null;
}
