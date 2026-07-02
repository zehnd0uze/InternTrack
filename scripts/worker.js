import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need SERVICE_ROLE to bypass RLS, but if we don't have it, we use ANON_KEY.
// Actually, earlier the user gave me the service role key!
// Let's just hardcode the service role key for this local worker so they don't have to put it in .env
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYnBhemlqeG1jY3dzbG9ka2Z2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjM2NjEzMCwiZXhwIjoyMDk3OTQyMTMwfQ.Z_-L6688igjj7fXzR8SfAaXVldNY-hyOo-lVwvZme0k";

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function checkAndSendAlerts() {
  const now = new Date();
  const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
  
  const currentHour = bkkTime.getHours().toString().padStart(2, '0');
  const currentMinute = bkkTime.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMinute}:00`;
  const todayStr = bkkTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

  console.log(`[${todayStr} ${currentTimeStr}] ตรวจสอบการแจ้งเตือน...`);

  try {
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
      return;
    }

    console.log(`พบ ${matchedAlerts.length} การแจ้งเตือนที่ต้องส่ง`);

    // Fetch subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    for (const alert of matchedAlerts) {
      let targetSubs = subscriptions;
      if (alert.target_role !== 'all') {
        targetSubs = subscriptions.filter(sub => sub.user_role === alert.target_role);
      }

      console.log(`- กำลังส่ง "${alert.title}" ไปยัง ${targetSubs.length} เครื่อง`);

      const payload = JSON.stringify({
        title: alert.title,
        body: alert.body,
        icon: '/pwa-192x192.png',
        badge: '/badge.svg',
        data: {
          url: '/'
        }
      });

      let successCount = 0;
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
          successCount++;
        } catch (error) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      }
      console.log(`  > ส่งสำเร็จ ${successCount}/${targetSubs.length} เครื่อง`);

      // Deactivate non-recurring alerts
      if (!alert.is_recurring) {
        await supabase
          .from('scheduled_notifications')
          .update({ is_active: false })
          .eq('id', alert.id);
      }
    }
  } catch (err) {
    console.error('Error processing alerts:', err);
  }
}

// Run loop
console.log('🚀 เริ่มทำงาน Background Worker บนเครื่องของคุณแล้ว... (กด Ctrl+C เพื่อหยุด)');
checkAndSendAlerts();
// check exactly at the 0th second of every minute for accuracy
setInterval(() => {
  if (new Date().getSeconds() === 0) {
    checkAndSendAlerts();
  }
}, 1000);
