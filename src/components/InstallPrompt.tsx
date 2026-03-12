import { useState, useEffect } from 'react';
import { Share, PlusSquare, Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
    });

    // Check if user dismissed it previously
    if (localStorage.getItem('pwa_prompt_dismissed')) {
      setIsDismissed(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed) return null;
  if (!isIOS && !deferredPrompt) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-4 z-50">
      <button 
        onClick={handleDismiss} 
        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
          <span className="text-white font-black text-2xl">P</span>
        </div>
        <div className="flex-1 pt-0.5">
          <h3 className="font-bold text-slate-900 text-[15px]">安裝 Protein Tracker</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed pr-4">
            加到主畫面，享受全螢幕 App 體驗，開啟速度更快！
          </p>
          
          {isIOS ? (
            <div className="mt-3 bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">
              <div className="flex items-center mb-1.5">
                1. 點擊下方 <Share className="w-4 h-4 mx-1.5 text-blue-500" /> 分享按鈕
              </div>
              <div className="flex items-center">
                2. 選擇「加入主畫面」<PlusSquare className="w-4 h-4 mx-1.5 text-slate-700" />
              </div>
            </div>
          ) : (
            <button 
              onClick={handleInstall}
              className="mt-3 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              立即安裝
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
