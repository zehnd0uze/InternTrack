import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  // CORS for same-origin Vercel calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, body, target_role = 'all' } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

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

    // Fetch all push subscriptions (service role bypasses RLS)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    // Filter by role if needed (push_subscriptions may not have user_role, so we join users)
    let targetSubs = subscriptions;
    if (target_role !== 'all') {
      // Get user IDs with the target role
      const { data: roleUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', target_role)
        .eq('is_active', true);

      const roleUserIds = new Set((roleUsers || []).map(u => u.id));
      targetSubs = subscriptions.filter(sub => roleUserIds.has(sub.user_id));
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/badge.svg',
      data: { url: '/' }
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const sub of targetSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        );
        totalSent++;
      } catch (err) {
        totalFailed++;
        // Remove expired/invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    // Also insert in-app notifications for all active students
    const { data: students } = await supabase
      .from('users')
      .select('id')
      .eq('role', target_role === 'all' ? 'student' : target_role)
      .eq('is_active', true);

    if (students && students.length > 0) {
      const notifRows = students.map(s => ({
        user_id: s.id,
        message: `${title}: ${body}`,
        type: 'announcement',
        is_read: false,
      }));
      await supabase.from('notifications').insert(notifRows);
    }

    return res.status(200).json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      total_subscriptions: targetSubs.length
    });

  } catch (error) {
    console.error('[send-broadcast] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
