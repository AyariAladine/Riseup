'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="mb-8">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <circle cx="12" cy="20" r="1" fill="currentColor" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold mb-4">Mode Hors Ligne</h1>
      <p className="muted max-w-lg text-lg mb-6">
        Vous n'êtes pas connecté à Internet. L'application fonctionne en mode hors ligne.
      </p>

      <div className="flex gap-4">
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Réessayer
        </button>
        <a href="/dashboard" className="btn">Continuer</a>
      </div>
    </div>
  );
}
