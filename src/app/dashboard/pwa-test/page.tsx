"use client";

import { useEffect, useState } from 'react';

export default function PWATestPage() {
  const [swStatus, setSwStatus] = useState<string>('Vérification...');
  const [isOnline, setIsOnline] = useState(true);
  const [cacheInfo, setCacheInfo] = useState<{ size: number; count: number } | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [screenInfo, setScreenInfo] = useState({ width: 0, height: 0, device: '', orientation: '' });

  useEffect(() => {
    // Vérifier le Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setSwStatus(`✅ Service Worker actif (scope: ${registration.scope})`);
      }).catch(() => {
        setSwStatus('❌ Service Worker non disponible');
      });

      // Écouter les messages du SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_SIZE') {
          setCacheInfo({
            size: event.data.size,
            count: event.data.count
          });
        }
      });
    } else {
      setSwStatus('❌ Service Worker non supporté');
    }

    // Vérifier le statut en ligne
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Vérifier si installable
    const handleBeforeInstall = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Vérifier si déjà installé (mode standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Mettre à jour les informations d'écran
    const updateScreenInfo = () => {
      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        device: window.innerWidth < 720 ? '📱 Mobile' : '💻 Desktop',
        orientation: window.innerWidth > window.innerHeight ? 'Paysage' : 'Portrait'
      });
    };
    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('resize', updateScreenInfo);
    };
  }, []);

  const getCacheSize = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_SIZE' });
    }
  };

  const clearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      setTimeout(() => {
        alert('Cache vidé! Rechargez la page.');
      }, 500);
    }
  };

  const testOffline = () => {
    alert('Pour tester le mode offline:\n1. Ouvrez DevTools (F12)\n2. Onglet Network\n3. Cochez "Offline"\n4. Rechargez la page');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        🧪 Tests PWA - RiseUP
      </h1>

      {/* Service Worker Status */}
      <section style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Service Worker
        </h2>
        <p style={{ marginBottom: '1rem' }}>{swStatus}</p>
        
        {cacheInfo && (
          <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
            <p>📦 Fichiers en cache: {cacheInfo.count}</p>
            <p>💾 Taille du cache: {(cacheInfo.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={getCacheSize} className="btn">
            Vérifier le cache
          </button>
          <button onClick={clearCache} className="btn" style={{ background: 'var(--danger)' }}>
            Vider le cache
          </button>
        </div>
      </section>

      {/* Online Status */}
      <section style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Statut de connexion
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isOnline ? '#22c55e' : '#ef4444'
          }} />
          <span>{isOnline ? '✅ En ligne' : '❌ Hors ligne'}</span>
        </div>
        <button onClick={testOffline} className="btn">
          Tester le mode offline
        </button>
      </section>

      {/* Installation Status */}
      <section style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Installation
        </h2>
        <p style={{ marginBottom: '1rem' }}>
          {isInstalled ? '✅ Application installée (mode standalone)' : 
           canInstall ? '📱 Installation disponible' : 
           '⏳ Installation possible après quelques secondes'}
        </p>
        <div style={{ fontSize: '0.875rem', color: 'var(--fg-muted)' }}>
          <p>Manifest: <a href="/manifest.webmanifest" target="_blank" className="link">Voir</a></p>
          <p>Service Worker: <a href="/sw.js" target="_blank" className="link">Voir</a></p>
        </div>
      </section>

      {/* Responsive Test */}
      <section style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Design Responsive
        </h2>
        <div style={{ fontSize: '0.875rem' }}>
          <p>Largeur d'écran: {screenInfo.width}px</p>
          <p>Hauteur d'écran: {screenInfo.height}px</p>
          <p>Type d'appareil: {screenInfo.device}</p>
          <p>Orientation: {screenInfo.orientation}</p>
        </div>
      </section>

      {/* Features Checklist */}
      <section style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          ✅ Fonctionnalités PWA
        </h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ padding: '0.5rem 0' }}>✅ Service Worker enregistré</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Web App Manifest configuré</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Mode hors ligne fonctionnel</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Application installable</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Design mobile-first & responsive</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Cache intelligent (Network/Cache First)</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Icônes adaptatives (72px - 512px)</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Page offline personnalisée</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Mises à jour automatiques</li>
          <li style={{ padding: '0.5rem 0' }}>✅ Prompt d'installation</li>
        </ul>
      </section>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/dashboard" className="btn btn-primary">
          Retour au Dashboard
        </a>
      </div>
    </div>
  );
}
