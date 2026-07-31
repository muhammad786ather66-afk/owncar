import React, { useState, useEffect } from 'react';
import { isPWAInstalled, promptPWAInstall } from '../utils/pwa';
import { Download, X, Smartphone, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const PWAInstallModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (isPWAInstalled()) {
      return;
    }

    // Check if dismissed recently (reappear after 24 hours if dismissed)
    const dismissedAt = localStorage.getItem('apnicar_pwa_dismissed');
    if (dismissedAt) {
      const timePassed = Date.now() - parseInt(dismissedAt, 10);
      if (timePassed < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    // Show popup after short 1.5s delay on open
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleInstallClick = async () => {
    const installed = await promptPWAInstall();
    if (installed) {
      setIsOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('apnicar_pwa_dismissed', Date.now().toString());
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Top Decorative Header */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          title="Dismiss for now"
          id="pwa-dismiss-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {/* App Icon */}
          <div className="w-16 h-16 mb-4 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-500/10">
            <Smartphone className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Fast & Offline Capable PWA
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Install <span className="text-emerald-600">Apni Car</span> App
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Get the full native mobile experience! Enjoy 1-tap bookings, zero commission rides, instant notifications, and offline map access.
          </p>

          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-3 w-full my-5 text-left text-xs text-slate-700">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Instant 1-Tap Launch</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero Driver Commission</span>
            </div>
          </div>

          {isIOS ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 text-left w-full mb-4">
              <p className="font-semibold mb-1">To Install on iPhone/iPad:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap the <strong>Share button</strong> in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              </ol>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              id="install-pwa-btn"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-98"
            >
              <Download className="w-5 h-5" />
              Install App on Phone / Desktop
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
};
