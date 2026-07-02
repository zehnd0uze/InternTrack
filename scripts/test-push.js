import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 

const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('❌ Missing VAPID keys in .env');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testPush() {
  console.log('Fetching subscriptions from Supabase...');
  
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error) {
    console.error('❌ Error fetching subscriptions:', error.message);
    return;
  }

  if (!subs || subs.length === 0) {
    console.log('⚠️ No push subscriptions found in database. Make sure you clicked "เปิดรับแจ้งเตือน" in the app first!');
    return;
  }

  console.log(`Found ${subs.length} subscriptions. Sending test messages...`);

  const payload = JSON.stringify({
    title: 'ทดสอบการแจ้งเตือนจากระบบ',
    body: 'นี่คือข้อความทดสอบ ส่งตรงเข้ามือถือ/คอมพิวเตอร์ของคุณ!',
    icon: '/pwa-192x192.png'
  });

  let successCount = 0;
  for (const sub of subs) {
    try {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };
      await webpush.sendNotification(pushSubscription, payload);
      successCount++;
      console.log(`✅ Sent successfully to subscription: ${sub.id}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${sub.id}:`, err.message);
    }
  }

  console.log(`\n🎉 Finished! Sent ${successCount}/${subs.length} notifications.`);
}

testPush();
