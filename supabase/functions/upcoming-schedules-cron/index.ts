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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate tomorrow's date bounds in Asia/Bangkok time
    const now = new Date();
    const bkkTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
    
    const tomorrow = new Date(bkkTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // YYYY-MM-DD
    const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
    
    // Convert tomorrow 00:00:00 and 23:59:59 BKK back to UTC to query the DB correctly
    // The easiest way is to query using string comparison on the date part, but timestamps are in UTC.
    // Instead of doing timezone conversions in JS, we can just fetch schedules >= now and < now + 48 hours, 
    // and then filter in JS to get exact 'tomorrow' BKK time.
    const startOfWindow = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endOfWindow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: schedules, error: schedErr } = await supabase
      .from("schedules")
      .select("*")
      .gte("start_time", startOfWindow)
      .lte("start_time", endOfWindow);

    if (schedErr) throw schedErr;

    // Filter for events that happen "tomorrow" in BKK time
    const upcomingSchedules = (schedules || []).filter((s) => {
      const startTimeBkk = new Date(s.start_time).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
      return startTimeBkk === tomorrowStr;
    });

    if (upcomingSchedules.length === 0) {
      return new Response(JSON.stringify({ message: "No schedules for tomorrow" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch placements to resolve mentor -> all students if student_id is null
    const { data: placements, error: placeErr } = await supabase
      .from("internship_placements")
      .select("mentor_id, student_id")
      .eq("status", "active");

    if (placeErr) throw placeErr;

    // Prepare notifications mapping: { userId: [schedule1, schedule2] }
    const userToSchedules: Record<string, any[]> = {};

    for (const s of upcomingSchedules) {
      const userIds = new Set<string>();
      // Mentor always gets notified
      userIds.add(s.mentor_id);

      if (s.student_id) {
        userIds.add(s.student_id);
      } else {
        // All students of this mentor
        const students = placements?.filter(p => p.mentor_id === s.mentor_id).map(p => p.student_id) || [];
        students.forEach(id => userIds.add(id));
      }

      for (const uid of userIds) {
        if (!userToSchedules[uid]) userToSchedules[uid] = [];
        userToSchedules[uid].push(s);
      }
    }

    const targetUserIds = Object.keys(userToSchedules);
    if (targetUserIds.length === 0) {
       return new Response(JSON.stringify({ message: "No target users found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch push subscriptions for all target users
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")
      .in("user_id", targetUserIds);

    if (subError) throw subError;

    // Group subscriptions by user
    const subsByUserId: Record<string, any[]> = {};
    for (const sub of subscriptions || []) {
      if (!subsByUserId[sub.user_id]) subsByUserId[sub.user_id] = [];
      subsByUserId[sub.user_id].push(sub);
    }

    let sent = 0;
    let failed = 0;
    const removedEndpoints: string[] = [];

    // Send notifications
    for (const userId of targetUserIds) {
      const userSubs = subsByUserId[userId];
      if (!userSubs || userSubs.length === 0) continue;

      const userEvents = userToSchedules[userId];
      
      // If a user has multiple events, summarize them
      let title = "พรุ่งนี้มีนัดหมาย! 📅";
      let body = "";

      if (userEvents.length === 1) {
        const ev = userEvents[0];
        const timeStr = new Date(ev.start_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: '2-digit', minute: '2-digit' });
        body = `"${ev.title}" เวลา ${timeStr} น.`;
      } else {
        body = `คุณมีกำหนดการทั้งหมด ${userEvents.length} รายการในวันพรุ่งนี้`;
      }

      const payload = JSON.stringify({
        title,
        body,
        icon: "/pwa-192x192.png",
        badge: "/badge.svg",
        url: "/student/dashboard" // Default to dashboard where they can see schedules
      });

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            removedEndpoints.push(sub.endpoint);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Upcoming schedules sent",
        sent,
        failed,
        removedStaleSubscriptions: removedEndpoints.length,
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
