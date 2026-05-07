import { supabase } from '@/integrations/supabase/client';

const SW_URL = '/push-sw.js';
const SW_SCOPE = '/push-sw/'; // dedicated scope so it never controls page navigation

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

async function registerSW(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
}

export async function getPermissionStatus(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

export async function enableDesktopPush(opts: {
  audience?: 'public' | 'admin';
  subscriberId?: string;
  label?: string;
} = {}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isPushSupported()) return { ok: false, reason: 'Your browser does not support push notifications.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'Permission was not granted.' };

  // Fetch VAPID public key
  const { data: keyResp, error: keyErr } = await supabase.functions.invoke('web-push', {
    body: { action: 'public_key' },
  });
  if (keyErr || !keyResp?.publicKey) {
    return { ok: false, reason: keyErr?.message || 'Could not retrieve VAPID public key.' };
  }

  const reg = await registerSW();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyResp.publicKey),
    });
  }

  const { error: subErr } = await supabase.functions.invoke('web-push', {
    body: {
      action: 'subscribe',
      subscription: sub.toJSON(),
      audience: opts.audience ?? 'public',
      subscriberId: opts.subscriberId,
      label: opts.label,
    },
  });
  if (subErr) return { ok: false, reason: subErr.message };
  return { ok: true };
}

export async function disableDesktopPush(): Promise<void> {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  try {
    await supabase.functions.invoke('web-push', {
      body: { action: 'unsubscribe', endpoint: sub.endpoint },
    });
  } catch (_e) {
    /* ignore */
  }
  await sub.unsubscribe();
}
