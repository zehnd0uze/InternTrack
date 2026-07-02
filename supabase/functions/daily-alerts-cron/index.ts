import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

// Configuration for web-push
webpush.setVapidDetails(
  "mailto:admin@ternietrack.com",
  Deno.env.get("VITE_VAPID_PUBLIC_KEY") || "",
  Deno.env.get("VAPID_PRIVATE_KEY") || ""
);

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // This cron runs at 07:50 and 15:50 (assuming ICT / UTC+7).
    // Let's determine if it's morning or afternoon.
    const now = new Date();
    // Getting current hour in UTC+7
    const currentHourStr = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Bangkok' }).split(':')[0];
    const currentHour = parseInt(currentHourStr, 10);

    const isMorning = currentHour === 7; // 07:50
    const isAfternoon = currentHour === 15; // 15:50
    const isTestTime = currentHour === 9; // 9:00 - 9:59 test time
    
    // Fallback if neither, maybe it's just a test
    const title = isMorning ? "ใกล้ถึงเวลาเข้างานแล้ว" : isAfternoon ? "ใกล้ถึงเวลาเลิกงานแล้ว" : "อรุณสวัสดิ์";
    const body = isMorning 
      ? "เวลา 08:00 น. อย่าลืมเข้าสู่ระบบและกดเช็คอินเพื่อเริ่มงาน" 
      : isAfternoon 
        ? "เวลา 16:00 น. อย่าลืมกดเช็คเอาท์เพื่อบันทึกเวลาทำงาน"
        : "Good morning student, have a nice day!";

    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }); // YYYY-MM-DD

    // Get all students (role: student) and their attendance today
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select(`
        id, role,
        attendance ( id, date, check_in, check_out ),
        push_subscriptions ( endpoint, p256dh, auth )
      `)
      .eq('role', 'student')
      .eq('attendance.date', todayStr);

    if (userError) throw userError;

    let pushCount = 0;

    for (const user of users) {
      if (!user.push_subscriptions || user.push_subscriptions.length === 0) continue;

      const att = user.attendance && user.attendance.length > 0 ? user.attendance[0] : null;

      let shouldSend = false;
      if (isMorning) {
        // Send if haven't checked in
        if (!att || !att.check_in) shouldSend = true;
      } else if (isAfternoon) {
        // Send if checked in but haven't checked out
        if (att && att.check_in && !att.check_out) shouldSend = true;
      } else if (isTestTime) {
        // Always send for testing if it's the test time
        shouldSend = true;
      } else {
        // Always send for testing if triggered manually outside window
        shouldSend = true;
      }

      if (shouldSend) {
        for (const sub of user.push_subscriptions) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          };

          const payload = JSON.stringify({
            title,
            body,
            url: "/student/dashboard"
          });

          try {
            await webpush.sendNotification(pushSubscription, payload);
            pushCount++;
          } catch (pushErr) {
            console.error("Error sending push to", sub.endpoint, pushErr);
            // If subscription is invalid/expired, we could delete it here
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
              await supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, pushesSent: pushCount }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
