"use client";
import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Temporarily disable Service Worker registration for development
    // if ('serviceWorker' in navigator) {
    //   const register = async () => {
    //     try {
    //       const registration = await navigator.serviceWorker.register('/sw.js', {
    //         scope: '/'
    //       });
          
    //       console.log('[PWA] Service Worker enregistré:', registration.scope);

    //       // Vérifier les mises à jour toutes les heures
    //       setInterval(() => {
    //         registration.update();
    //       }, 60 * 60 * 1000);

    //       // Détecter une nouvelle version du SW
    //       registration.addEventListener('updatefound', () => {
    //         const newWorker = registration.installing;
    //         if (newWorker) {
    //           newWorker.addEventListener('statechange', () => {
    //             if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
    //               // Nouvelle version disponible
    //               setShowUpdatePrompt(true);
    //             }
    //           });
    //         }
    //       });
    //     } catch (err) {
    //       console.warn('[PWA] Échec enregistrement SW:', err);
    //     }
    //   };
    //   register();
    // }    // Détecter l'événement d'installation PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Montrer rapidement pour les tests (5 secondes au lieu de 30)
      setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
        if (!hasSeenPrompt) {
          setShowInstallPrompt(true);
        }
      }, 5000); // Attendre 5 secondes seulement
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Détecter si l'app est déjà installée
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Application installée!');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Installation:', outcome);
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-prompt-seen', 'true');
  };

  const handleDismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('pwa-install-prompt-seen', 'true');
  };

  const handleUpdate = () => {
    // Dire au SW de skip waiting et activer immédiatement
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Recharger la page après un court délai
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return (
    <>
      {/* Prompt d'installation PWA */}
      {showInstallPrompt && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>
                Installer RiseUP
              </h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--fg-muted)', marginBottom: '1rem' }}>
                Installez l'application pour un accès rapide et une expérience hors ligne.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={handleInstallClick}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Installer
                </button>
                <button
                  onClick={handleDismissInstall}
                  style={{
                    padding: '0.5rem 1rem',
                    background: 'transparent',
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button
              onClick={handleDismissInstall}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                color: 'var(--fg-muted)',
                padding: 0,
                lineHeight: 1
              }}
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Prompt de mise à jour */}
      {showUpdatePrompt && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: '600' }}>
                Mise à jour disponible
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
                Une nouvelle version est prête
              </p>
            </div>
            <button
              onClick={handleUpdate}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Actualiser
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateX(-50%) translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
