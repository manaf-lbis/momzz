import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, ChevronRight } from 'lucide-react';

export const InstallAppBanner: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running as standalone app
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if dismissed in session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsDismissed(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDirectInstall = async () => {
    const promptEvent = (window as any).deferredPwaPrompt;

    if (promptEvent) {
      try {
        // Trigger native 1-tap browser install prompt directly
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        (window as any).deferredPwaPrompt = null;
        if (outcome === 'accepted') {
          setIsDismissed(true);
        }
      } catch (err) {
        console.error('[PWA] Direct prompt error:', err);
      }
    } else {
      // Fallback: trigger native browser install if supported or notify user
      alert("Tap 'Install' or 'Add to Home screen' from your browser menu to complete installation.");
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || isDismissed || isInstalled) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 px-3 sm:px-4 py-2.5 shadow-lg relative border-b border-yellow-500/50 flex flex-wrap items-center justify-between gap-2 z-40 animate-fadeIn">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/logo.png"
          alt="MOMZ'Z AUTOMOTIVE Logo"
          className="w-8 h-8 rounded-lg object-cover bg-black border border-zinc-900 shrink-0 shadow-md"
        />

        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold uppercase tracking-tight flex items-center gap-1 truncate">
            <span>Install MOMZ'Z AUTO GARAGE App</span>
          </p>
          <p className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-900 opacity-90 truncate">
            Instant 1-Tap Mobile & Desktop App Access
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleDirectInstall}
          className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 text-yellow-400 font-mono font-bold text-xs uppercase rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4 text-yellow-400" />
          <span>Install Now</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-zinc-950/20 text-zinc-900 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
