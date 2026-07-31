let deferredInstallPrompt: any = null;

export function initPWA() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('Apni Car SW Registered:', reg.scope),
        (err) => console.log('Apni Car SW Registration Failed:', err)
      );
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
}

export function isPWAInstalled(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if ((navigator as any).standalone) {
    return true;
  }
  return false;
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredInstallPrompt) {
    return false;
  }
  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;
  if (choiceResult.outcome === 'accepted') {
    deferredInstallPrompt = null;
    return true;
  }
  return false;
}
