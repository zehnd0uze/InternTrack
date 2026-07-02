import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  Deno.env.get("VITE_VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current time in Bangkok timezone
    const now = new Date();
    const bkkTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    
    // Format current hour and minute: HH:mm:00
    const currentHour = bkkTime.getHours().toString().padStart(2, '0');
    const currentMinute = bkkTime.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMinute}:00`;
    const todayStr = bkkTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    console.log(`[scheduled-alerts] Running at ${todayStr} ${currentTimeStr} (BKK time)`);

    // Find active scheduled notifications that match the current time
    // AND (is_recurring = true OR scheduled_date = today)
    const { data: alerts, error: alertError } = await supabaseClient
      .from('scheduled_notifications')
      .select('*')
      .eq('is_active', true)
      .eq('scheduled_time', currentTimeStr);

    if (alertError) throw alertError;

    const matchedAlerts = (alerts || []).filter(a => {
      if (a.is_recurring) return true;
      if (a.scheduled_date === todayStr) return true;
      return false;
    });

    if (matchedAlerts.length === 0) {
      return new Response(JSON.stringify({ message: "No scheduled alerts for this minute" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${matchedAlerts.length} scheduled alerts to send.`);

    // Get all users and their subscriptions
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select(`
        id, role,
        push_subscriptions ( endpoint, p256dh, auth )
      `);

    if (userError) throw userError;

    let pushCount = 0;
    const errors: any[] = [];

    // For each alert, send to matching users
    for (const alert of matchedAlerts) {
      const payload = JSON.stringify({
        title: alert.title,
        body: alert.body,
        icon: '/pwa-192x192.png'
      });

      for (const user of users) {
        // Check if user role matches target_role
        if (alert.target_role !== 'all' && user.role !== alert.target_role) {
          continue; // Skip
        }

        if (!user.push_subscriptions || user.push_subscriptions.length === 0) continue;

        // Send to all their devices
        for (const sub of user.push_subscriptions) {
          try {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            };
            await webpush.sendNotification(pushSubscription, payload);
            pushCount++;
          } catch (err: any) {
            console.error('Failed to push to endpoint', sub.endpoint, err);
            // If it's a 410 (Gone) or 404 (Not Found), the subscription is no longer valid.
            if (err.statusCode === 410 || err.statusCode === 404) {
               await supabaseClient
                 .from('push_subscriptions')
                 .delete()
                 .eq('endpoint', sub.endpoint);
            }
            errors.push(err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Success", 
        alertsSent: matchedAlerts.length,
        pushesSent: pushCount, 
        errors 
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
