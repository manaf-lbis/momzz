import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share, PlusSquare, X, CheckCircle, ChevronRight, Wrench, MoreVertical } from 'lucide-react';

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode
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

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
          setIsDismissed(true);
          return;
        }
      } catch (err) {
        console.error('[PWA] Native prompt error:', err);
      }
    }
    // Fallback: show interactive step-by-step installation modal
    setShowModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || isDismissed) return null;

  return (
    <>
      {/* TOP INSTALL APP BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-zinc-950 px-3 sm:px-4 py-2.5 shadow-lg relative border-b border-yellow-500/50 flex flex-wrap items-center justify-between gap-2 z-40 animate-fadeIn">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-950 text-yellow-400 flex items-center justify-center font-bold shrink-0 shadow-md">
            <Smartphone className="w-4 h-4 animate-bounce" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-extrabold uppercase tracking-tight flex items-center gap-1 truncate">
              <span>Install MOMZ'Z AUTO GARAGE App</span>
            </p>
            <p className="text-[10px] sm:text-[11px] font-mono font-semibold text-zinc-900 opacity-90 truncate">
              {isIOS ? 'Quick access for iPhone & iPad' : 'Instant 1-Tap App for Android & PC'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
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

      {/* INSTALLATION GUIDE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl text-zinc-100 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400 text-zinc-950 flex items-center justify-center font-bold shrink-0">
                <Wrench className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-zinc-100">
                  MOMZ'Z AUTO GARAGE
                </h3>
                <p className="text-[11px] font-mono text-yellow-400">
                  {isIOS ? 'iOS Safari Setup' : 'Android & Chrome Setup'}
                </p>
              </div>
            </div>

            {isIOS ? (
              /* iOS Guide */
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 1: Tap Share Button</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Tap the Share icon <span className="font-bold text-yellow-400">📤</span> at the bottom of Safari browser.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 2: Add to Home Screen</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Scroll down and tap <span className="font-bold text-yellow-400">'Add to Home Screen'</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 3: Confirm & Launch</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Tap <span className="font-bold text-yellow-400">'Add'</span> top-right. Open MOMZ'Z AUTO GARAGE directly from home screen!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Desktop Chrome Guide */
              <div className="space-y-3.5 text-xs">
                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 1: Open Chrome Menu</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Tap the 3 dots menu <span className="font-bold text-yellow-400">⋮</span> at the top right of your browser.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 2: Tap Install app / Add to Home</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      Select <span className="font-bold text-yellow-400">'Install app'</span> or <span className="font-bold text-yellow-400">'Add to Home screen'</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800">
                  <div className="p-2 bg-yellow-400/10 text-yellow-400 rounded-xl shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-200">Step 3: Launch Native App</p>
                    <p className="text-zinc-400 text-[11px] mt-0.5">
                      The MOMZ'Z AUTO GARAGE app icon will appear on your phone home screen!
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-mono font-bold text-xs uppercase rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
