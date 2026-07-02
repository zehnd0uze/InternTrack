import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  // Only allow POST or GET (GET for testing)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials in environment' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    webpush.setVapidDetails(
      'mailto:example@yourdomain.org',
      process.env.VITE_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const now = new Date();
    const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    const currentHour = bkkTime.getHours().toString().padStart(2, '0');
    const currentMinute = bkkTime.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}:00`;
    const todayStr = bkkTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    console.log(`[Vercel API] Checking alerts at ${todayStr} ${currentTimeStr}`);

    const { data: alerts, error: alertError } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .eq('scheduled_time', currentTimeStr);

    if (alertError) throw alertError;

    const matchedAlerts = (alerts || []).filter(a => {
      if (a.is_recurring) return true;
      return a.scheduled_date === todayStr;
    });

    if (matchedAlerts.length === 0) {
      return res.status(200).json({ message: 'No alerts to send at this time.' });
    }

    // Fetch subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    let totalSent = 0;

    for (const alert of matchedAlerts) {
      let targetSubs = subscriptions;
      if (alert.target_role !== 'all') {
        targetSubs = subscriptions.filter(sub => sub.user_role === alert.target_role);
      }

      const payload = JSON.stringify({
        title: alert.title,
        body: alert.body,
        icon: '/pwa-192x192.png',
        badge: '/badge.svg',
        data: {
          url: '/'
        }
      });

      for (const sub of targetSubs) {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          };
          await webpush.sendNotification(pushSubscription, payload);
          totalSent++;
        } catch (error) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }

      // Deactivate non-recurring alerts
      if (!alert.is_recurring) {
        await supabase
          .from('scheduled_notifications')
          .update({ is_active: false })
          .eq('id', alert.id);
      }
    }

    return res.status(200).json({ success: true, sent: totalSent, time: currentTimeStr });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
