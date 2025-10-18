"use client";

import { useEffect, useState } from 'react';

export default function InstallCheckPage() {
  const [checks, setChecks] = useState({
    serviceWorker: '⏳ Checking...',
    manifest: '⏳ Checking...',
    https: '⏳ Checking...',
    icons: '⏳ Checking...',
    installEvent: '⏳ Waiting...',
    isInstalled: '⏳ Checking...'
  });

  useEffect(() => {
    const runChecks = async () => {
      const newChecks = { ...checks };

      // Check HTTPS (localhost is OK)
      newChecks.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost' 
        ? '✅ OK (localhost or HTTPS)' 
        : '❌ Requires HTTPS';

      // Check Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          newChecks.serviceWorker = `✅ Active (scope: ${reg.scope})`;
        } catch {
          newChecks.serviceWorker = '❌ Not registered';
        }
      } else {
        newChecks.serviceWorker = '❌ Not supported';
      }

      // Check Manifest
      try {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          const href = manifestLink.getAttribute('href');
          const response = await fetch(href!);
          if (response.ok) {
            const manifest = await response.json();
            newChecks.manifest = `✅ Valid (${manifest.name})`;
            
            // Check icons
            if (manifest.icons && manifest.icons.length >= 2) {
              const has192 = manifest.icons.some((i: any) => i.sizes === '192x192');
              const has512 = manifest.icons.some((i: any) => i.sizes === '512x512');
              if (has192 && has512) {
                newChecks.icons = `✅ Has required icons (${manifest.icons.length} total)`;
              } else {
                newChecks.icons = '⚠️ Missing 192x192 or 512x512 icon';
              }
            } else {
              newChecks.icons = '❌ Not enough icons';
            }
          } else {
            newChecks.manifest = '❌ Failed to fetch';
          }
        } else {
          newChecks.manifest = '❌ No manifest link in HTML';
        }
      } catch (err) {
        newChecks.manifest = `❌ Error: ${err}`;
      }

      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        newChecks.isInstalled = '✅ Already installed (running in standalone mode)';
      } else {
        newChecks.isInstalled = '⏳ Not installed yet';
      }

      setChecks(newChecks);
    };

    runChecks();

    // Listen for install event
    const handleBeforeInstall = (e: Event) => {
      console.log('🎉 beforeinstallprompt event fired!');
      setChecks(prev => ({
        ...prev,
        installEvent: '✅ Install event fired! Icon should appear in address bar'
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      setChecks(prev => ({
        ...prev,
        isInstalled: '✅ Just installed!'
      }));
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        🔍 PWA Installation Diagnostic
      </h1>
      
      <div style={{ 
        background: '#1a1d21', 
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Installation Checklist</h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>HTTPS/Localhost</td>
              <td style={{ padding: '0.75rem' }}>{checks.https}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>Service Worker</td>
              <td style={{ padding: '0.75rem' }}>{checks.serviceWorker}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>Web Manifest</td>
              <td style={{ padding: '0.75rem' }}>{checks.manifest}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>Icons</td>
              <td style={{ padding: '0.75rem' }}>{checks.icons}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #30363d' }}>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>Install Event</td>
              <td style={{ padding: '0.75rem' }}>{checks.installEvent}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.75rem', fontWeight: '600' }}>Installation Status</td>
              <td style={{ padding: '0.75rem' }}>{checks.isInstalled}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ 
        background: '#0969da', 
        color: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', fontWeight: '600' }}>
          📍 How to See the Install Icon
        </h3>
        <ol style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Make sure all checks above show ✅</li>
          <li>Open DevTools (F12) → Application tab → Manifest</li>
          <li>Check that "Installability" says "Page is installable"</li>
          <li>Scroll or click on this page (user engagement required)</li>
          <li>Wait 5 seconds - popup should appear at bottom</li>
          <li>OR look for install icon (⊕ or ↓) in address bar on the right</li>
        </ol>
      </div>

      <div style={{ 
        background: '#1a1d21',
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', fontWeight: '600' }}>
          🧪 Manual Tests
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => {
              navigator.serviceWorker.ready.then(reg => {
                alert(`✅ Service Worker is ready!\nScope: ${reg.scope}`);
              }).catch(() => {
                alert('❌ Service Worker not ready');
              });
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#238636',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Test Service Worker
          </button>

          <button
            onClick={() => {
              fetch('/manifest.webmanifest')
                .then(r => r.json())
                .then(m => {
                  alert(`✅ Manifest loaded!\nName: ${m.name}\nIcons: ${m.icons.length}`);
                  console.log('Manifest:', m);
                })
                .catch(err => alert(`❌ Manifest error: ${err}`));
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#238636',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Test Manifest
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('pwa-install-prompt-seen');
              alert('✅ Reset! Reload the page and wait 5 seconds for the install prompt.');
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#0969da',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Reset Install Prompt
          </button>

          <button
            onClick={() => {
              window.open('https://web.dev/articles/install-criteria', '_blank');
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6e7781',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            📖 Read Install Criteria (web.dev)
          </button>
        </div>
      </div>

      <div style={{ 
        background: '#fff3cd',
        color: '#664d03',
        border: '1px solid #ffecb5',
        borderRadius: '8px',
        padding: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem', fontWeight: '600' }}>
          ⚠️ Important Notes
        </h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Chrome only shows the install icon after the <code>beforeinstallprompt</code> event fires</li>
          <li>This event requires <strong>user engagement</strong> (click, scroll, type)</li>
          <li>The event won't fire if the app is already installed</li>
          <li>Some browsers (Firefox) don't show an icon - use menu instead</li>
          <li>On mobile, the prompt appears more reliably</li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/dashboard" style={{ 
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#0969da',
          color: 'white',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: '500'
        }}>
          ← Back to Dashboard
        </a>
      </div>
    </div>
  );
}
