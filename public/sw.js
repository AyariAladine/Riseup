// Service Worker pour RiseUP PWA
// Stratégies de cache: Network First pour API, Cache First pour assets statiques

const CACHE_VERSION = 'v3';
const CACHE_NAME = `riseup-pwa-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline';

// Assets critiques à mettre en cache immédiatement (uniquement statiques)
const CRITICAL_ASSETS = [
  '/offline',
  '/manifest.webmanifest',
  '/icon.svg',
];

// Routes API à gérer avec Network First strategy
const API_ROUTES = [
  '/api/dashboard',
  '/api/tasks',
  '/api/profile',
  '/api/learn/chat',
  '/api/assistant/analyze',
];

// Installation du Service Worker - Mise en cache des assets critiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Mise en cache des assets critiques');
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn('[SW] Échec de mise en cache de certains assets:', err);
        // Continue même si certains assets échouent
        return Promise.resolve();
      });
    }).then(() => {
      console.log('[SW] Installation terminée');
      return self.skipWaiting(); // Active immédiatement le nouveau SW
    })
  );
});

// Activation - Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation terminée');
      return self.clients.claim(); // Prend le contrôle immédiatement
    })
  );
});

// Stratégie Network First avec fallback sur cache (pour API)
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Essayer le réseau en premier avec timeout
    const fetchPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), 5000)
    );
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      // Ne mettre en cache que les requêtes GET
      if (request.method === 'GET') {
        cache.put(request, response.clone());
      }
      return response;
    }
    
    // Si erreur réseau, utiliser le cache
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Ne pas essayer le cache pour les requêtes POST/PUT/DELETE
    if (request.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Network unavailable' }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Si API et aucun cache, retourner une réponse JSON par défaut
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          offline: true, 
          message: 'Vous êtes hors ligne. Données non disponibles.' 
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        }
      );
    }
    
    throw error;
  }
}

// Stratégie Cache First avec fallback sur réseau (pour assets statiques)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Mettre à jour en arrière-plan si possible
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
    }).catch(() => {
      // Ignorer les erreurs de mise à jour en arrière-plan
    });
    
    return cachedResponse;
  }
  
  // Si pas en cache, récupérer du réseau et mettre en cache
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Intercepter toutes les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Ignorer les requêtes Chrome extensions, analytics, etc.
  if (url.origin !== location.origin) {
    return;
  }
  
  // Stratégie Network First pour les routes API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request).catch(async () => {
        // Si tout échoue, retourner une réponse offline JSON
        return new Response(
          JSON.stringify({ 
            offline: true, 
            message: 'Mode hors ligne - Données non disponibles',
            cached: false
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }
  
  // Stratégie Network First pour les pages HTML dynamiques
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request).catch(async () => {
        // Fallback sur la page offline
        const cache = await caches.open(CACHE_NAME);
        const offlineResponse = await cache.match(OFFLINE_URL);
        return offlineResponse || new Response('Offline - Page non disponible', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }
  
  // Stratégie Cache First pour tous les autres assets (JS, CSS, images, fonts)
  event.respondWith(
    cacheFirst(request).catch(() => {
      // Si asset statique échoue, retourner une réponse vide
      return new Response('', { status: 404 });
    })
  );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache effacé');
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const keys = await cache.keys();
        const sizes = await Promise.all(
          keys.map(async (request) => {
            const response = await cache.match(request);
            const blob = await response.blob();
            return blob.size;
          })
        );
        const totalSize = sizes.reduce((acc, size) => acc + size, 0);
        
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ 
              type: 'CACHE_SIZE', 
              size: totalSize,
              count: keys.length
            });
          });
        });
      })
    );
  }
});

// Gestion de la synchronisation en arrière-plan (Background Sync API)
self.addEventListener('sync', (event) => {
  console.log('[SW] Synchronisation:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      // Synchroniser les tâches en attente
      fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(() => {
        console.log('[SW] Tâches synchronisées');
      }).catch((err) => {
        console.error('[SW] Erreur de synchronisation:', err);
        throw err; // Retry
      })
    );
  }
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push reçu');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'RiseUP';
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification cliquée:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focus
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[SW] Service Worker chargé');
