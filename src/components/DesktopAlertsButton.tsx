import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  enableDesktopPush,
  disableDesktopPush,
  getCurrentSubscription,
  getPermissionStatus,
  isPushSupported,
  isInIframe,
} from '@/lib/push';

interface Props {
  audience?: 'public' | 'admin';
  className?: string;
}

export function DesktopAlertsButton({ audience = 'public', className }: Props) {
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isPushSupported()) {
        if (mounted) setSupported(false);
        return;
      }
      const perm = await getPermissionStatus();
      const sub = await getCurrentSubscription();
      if (!mounted) return;
      setEnabled(perm === 'granted' && !!sub);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!supported) return null;

  const inIframe = isInIframe();

  const openInNewTab = () => {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onClick = async () => {
    if (inIframe && !enabled) {
      toast.info('Open the app in its own tab', {
        description:
          'Browsers block notification permission inside the Lovable preview iframe. Click "Open in tab" to continue.',
        action: { label: 'Open in tab', onClick: openInNewTab },
        duration: 8000,
      });
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await disableDesktopPush();
        setEnabled(false);
        toast.success('Desktop alerts turned off');
      } else {
        const result = await enableDesktopPush({ audience });
        if (result.ok) {
          setEnabled(true);
          toast.success('Desktop alerts enabled', {
            description: 'New articles will appear in your system tray / notification centre.',
          });
        } else {
          toast.error('Could not enable alerts', {
            description: 'reason' in result ? result.reason : undefined,
            duration: 8000,
          });
        }
      }
    } catch (err) {
      toast.error('Something went wrong', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const Icon = busy ? Loader2 : inIframe && !enabled ? ExternalLink : enabled ? BellRing : Bell;
  return (
    <Button
      type="button"
      variant={enabled ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      disabled={busy}
      className={className}
      title={
        inIframe && !enabled
          ? 'Open the app in its own tab to enable desktop alerts'
          : enabled
            ? 'Desktop alerts enabled — click to disable'
            : 'Get insurance news in your system tray'
      }
    >
      <Icon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline ml-1.5">
        {enabled ? 'Alerts on' : inIframe ? 'Open in tab to enable' : 'Desktop alerts'}
      </span>
    </Button>
  );
}

export function DesktopAlertsOffButton(props: { className?: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={props.className}
      onClick={async () => {
        await disableDesktopPush();
        toast.success('Disabled');
      }}
    >
      <BellOff className="h-4 w-4" />
    </Button>
  );
}
