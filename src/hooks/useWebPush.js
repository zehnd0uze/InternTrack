import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// Utility to convert Base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush(user) {
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if service workers and push messages are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser.');
      return;
    }

    const initPush = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setIsSubscribed(true);
          
          // Auto-sync to database just in case the database was reset
          const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(existingSubscription.getKey('p256dh'))));
          const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(existingSubscription.getKey('auth'))));
          
          await supabase.from('push_subscriptions').upsert({
            user_id: user.id,
            endpoint: existingSubscription.endpoint,
            p256dh: p256dh,
            auth: auth
          }, { onConflict: 'endpoint' });
        }
      } catch (err) {
        console.error('Error checking push subscription:', err);
      }
    };

    initPush();
  }, [user]);

  const subscribeUser = async () => {
    if (!user) {
      toast.error('ต้องเข้าสู่ระบบก่อน');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get the VAPID public key from env
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('Missing VAPID public key in environment variables.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });

      // Extract keys
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh'))));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))));
      const endpoint = subscription.endpoint;

      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth
      }, { onConflict: 'endpoint' });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      toast.success('เปิดการแจ้งเตือนสำเร็จ!');
      return true;
    } catch (err) {
      console.error('Failed to subscribe user:', err);
      toast.error('ไม่สามารถเปิดการแจ้งเตือนได้: ' + err.message);
      return false;
    }
  };

  return { isSubscribed, subscribeUser };
}
