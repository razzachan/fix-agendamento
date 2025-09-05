import { VAPID_PUBLIC_KEY, base64ToUint8Array } from '@/config/push';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function isPushSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeUserToPush(): Promise<PushSubscriptionPayload | null> {
  try {
    if (!(await isPushSupported())) return null;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const json = existing.toJSON() as PushSubscriptionPayload;
      return json;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] VAPID_PUBLIC_KEY ausente. Configure VITE_VAPID_PUBLIC_KEY.');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON() as PushSubscriptionPayload;
    return json;
  } catch (error) {
    console.error('[Push] Erro ao assinar push:', error);
    return null;
  }
}

