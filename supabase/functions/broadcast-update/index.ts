import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  Deno.env.get("VITE_VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

const NOTIFICATION = {
  title: "TernieTrack มีอัปเดตใหม่",
  body: "ขณะนี้คุณสามารถเปิด-ปิดการแจ้งเตือนได้เองที่เมนูด้านซ้าย กดเพื่อดูรายละเอียด",
  icon: "/pwa-192x192.png",
  badge: "/badge.svg",
  url: "/",
};

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Optional: check for a simple secret header to prevent abuse
  const authHeader = req.headers.get("x-admin-secret");
  const expectedSecret = Deno.env.get("ADMIN_BROADCAST_SECRET");
  if (expectedSecret && authHeader !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all mentor and student users with their push subscriptions
    const { data: users, error: userError } = await supabase
      .from("users")
      .select(`
        id, role,
        push_subscriptions ( endpoint, p256dh, auth )
      `)
      .in("role", ["mentor", "student"]);

    if (userError) throw userError;

    const payload = JSON.stringify(NOTIFICATION);
    let sent = 0;
    let failed = 0;
    const removedEndpoints: string[] = [];

    for (const user of users ?? []) {
      if (!user.push_subscriptions?.length) continue;

      for (const sub of user.push_subscriptions) {
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
          console.error("Push failed:", sub.endpoint, err?.statusCode);
          failed++;
          // Remove stale subscriptions
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            removedEndpoints.push(sub.endpoint);
          }
        }
      }
    }

    console.log(`Broadcast: sent=${sent}, failed=${failed}`);

    return new Response(
      JSON.stringify({
        message: "Broadcast complete",
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
