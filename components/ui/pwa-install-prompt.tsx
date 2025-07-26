'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: "App installed!",
        description: "You can now use Daygent from your home screen.",
      });
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-card border rounded-lg shadow-lg max-w-sm">
      <h3 className="font-semibold mb-2">Install Daygent</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Install Daygent for quick access and offline capabilities.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={handleInstallClick}
          size="sm"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Install
        </Button>
        <Button
          onClick={() => setShowInstallPrompt(false)}
          variant="outline"
          size="sm"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}