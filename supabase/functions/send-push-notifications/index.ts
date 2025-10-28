import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0";

// Types
interface PushSubscriptionDB {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  enabled: boolean;
}

interface Cycle {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  length: number | null;
}

interface NotificationType {
  type: string;
  title: string;
  body: string;
  url: string;
}

interface NotificationSchedule {
  schedule_date: string;
  morning_brief_sent: boolean;
  morning_brief_sent_at: string | null;
  cycle_notification_target_minutes: number;
  cycle_notification_sent: boolean;
  cycle_notification_sent_at: string | null;
}

// VAPID keys from environment
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";

// Constants
const APP_BASE_URL = "https://segigu.github.io/flomoon/";
const NOTIFICATIONS_URL = `${APP_BASE_URL}?open=notifications`;
const MORNING_BRIEF_URL = `${APP_BASE_URL}?open=daily-horoscope`;
const BERLIN_TZ = "Europe/Berlin";
const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Morning brief timing: 7:15 Berlin = 6:15 UTC (375 minutes from midnight UTC)
const MORNING_BRIEF_TARGET_MINUTES_UTC = 6 * 60 + 15; // 375 minutes
const MORNING_BRIEF_WINDOW_MINUTES = 5; // 5 minute window (6:15-6:20 UTC)

// Fallback messages
const fallbackMessages: Record<string, NotificationType> = {
  fertile_window: {
    type: "fertile_window",
    title: "Людмила Фертильная",
    body: "Настюш, зона риска, без защиты ни шагу! Презервативы в боевой готовности! 💋🛡️",
    url: NOTIFICATIONS_URL,
  },
  ovulation_day: {
    type: "ovulation_day",
    title: "Фёдор Плодовитый",
    body: "Настёна, сегодня овуляция — прикрывайся как на войне, это не шутки! 🔥",
    url: NOTIFICATIONS_URL,
  },
  period_forecast: {
    type: "period_forecast",
    title: "Зоя ПМСова",
    body: "Настюх, пара дней до шторма — запасайся шоколадом, грелкой и терпением! 🙄🍫",
    url: NOTIFICATIONS_URL,
  },
  period_check: {
    type: "period_check",
    title: "Вероника Контрольная",
    body: "Настюх, день Х по прогнозу — проверься и отметь, если началось! 👀",
    url: NOTIFICATIONS_URL,
  },
  period_waiting: {
    type: "period_waiting",
    title: "Глаша Терпеливая",
    body: "Настёна, задержка — прислушайся к организму, он знает что творит! 🤔",
    url: NOTIFICATIONS_URL,
  },
  period_delay_warning: {
    type: "period_delay_warning",
    title: "Римма Тревожная",
    body: "Настюш, задержка затянулась — может, пора тест сделать? Береги нервы! 😬🧪",
    url: NOTIFICATIONS_URL,
  },
  period_confirmed_day0: {
    type: "period_confirmed_day0",
    title: "Тамара Пледовая",
    body: "Настёна, старт! Плед, грелка, любимый сериал — минимум героических подвигов! 🛋️💜",
    url: NOTIFICATIONS_URL,
  },
  period_confirmed_day1: {
    type: "period_confirmed_day1",
    title: "Соня Грелочникова",
    body: "Настюш, второй день — грелку к пузику, шоколадку в рот, всех нафиг! 🔥🍫",
    url: NOTIFICATIONS_URL,
  },
  period_confirmed_day2: {
    type: "period_confirmed_day2",
    title: "Инга Железистая",
    body: "Настёна, третий день, пей воду, береги нервы — скоро станет легче, держись! 💪✨",
    url: NOTIFICATIONS_URL,
  },
  birthday: {
    type: "birthday",
    title: "Галя Именинница",
    body: "Настюш, с днюхой! Праздник без драмы, торт и подарки обязательны! 🎉💜🎂",
    url: NOTIFICATIONS_URL,
  },
  morning_brief: {
    type: "morning_brief",
    title: "Утренний пинок",
    body: "Настя, сегодня выживание на грани — терпи, вечером полегчает, обещаем! 💥",
    url: MORNING_BRIEF_URL,
  },
};

// Helper: Calculate average cycle length
function calculateAverageCycleLength(cycles: Cycle[]): number {
  if (cycles.length === 0) return 28;

  const completedCycles = cycles.filter(
    (c) => c.length !== null && c.length > 0
  );

  if (completedCycles.length === 0) return 28;

  const sum = completedCycles.reduce((acc, c) => acc + (c.length || 0), 0);
  return Math.round(sum / completedCycles.length);
}

// Helper: Determine notification type for today (cycle-based)
function determineCycleNotificationType(
  cycles: Cycle[],
  today: Date
): NotificationType | null {
  if (cycles.length === 0) return null;

  // Sort cycles by start date (newest first)
  const sortedCycles = [...cycles].sort(
    (a, b) =>
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  const lastCycle = sortedCycles[0];
  const lastStartDate = new Date(lastCycle.start_date);
  const daysSinceLastStart = Math.floor(
    (today.getTime() - lastStartDate.getTime()) / MS_IN_DAY
  );

  // Birthday check (April 12)
  if (today.getMonth() === 3 && today.getDate() === 12) {
    return fallbackMessages.birthday;
  }

  // Period confirmed (if cycle started recently)
  if (daysSinceLastStart === 0) {
    return fallbackMessages.period_confirmed_day0;
  }
  if (daysSinceLastStart === 1) {
    return fallbackMessages.period_confirmed_day1;
  }
  if (daysSinceLastStart === 2) {
    return fallbackMessages.period_confirmed_day2;
  }

  // Calculate expected next period
  const avgLength = calculateAverageCycleLength(cycles);
  const expectedNextStart = new Date(lastStartDate);
  expectedNextStart.setDate(expectedNextStart.getDate() + avgLength);

  const daysUntilExpected = Math.floor(
    (expectedNextStart.getTime() - today.getTime()) / MS_IN_DAY
  );

  // Ovulation (14 days before expected next period)
  if (daysUntilExpected === 14) {
    return fallbackMessages.ovulation_day;
  }

  // Fertile window (15-19 days before expected next period)
  if (daysUntilExpected >= 15 && daysUntilExpected <= 19) {
    return fallbackMessages.fertile_window;
  }

  // Period forecast (1-5 days before expected start)
  if (daysUntilExpected >= 1 && daysUntilExpected <= 5) {
    return fallbackMessages.period_forecast;
  }

  // Period check (expected start day)
  if (daysUntilExpected === 0) {
    return fallbackMessages.period_check;
  }

  // Period waiting (1-2 days delay)
  if (daysUntilExpected >= -2 && daysUntilExpected < 0) {
    return fallbackMessages.period_waiting;
  }

  // Period delay warning (3+ days delay)
  if (daysUntilExpected < -2) {
    return fallbackMessages.period_delay_warning;
  }

  return null;
}

// Helper: Send Web Push notification using @negrel/webpush
async function sendWebPush(
  appServer: webpush.ApplicationServer,
  subscription: PushSubscriptionDB,
  notification: NotificationType
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create PushSubscription object for the library
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    // Create subscriber
    const subscriber = appServer.subscribe(pushSubscription);

    // Prepare payload
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url,
      icon: `${APP_BASE_URL}logo192.png`,
      badge: `${APP_BASE_URL}logo192.png`,
    });

    // Send notification
    await subscriber.pushTextMessage(payload, {
      urgency: "normal",
      ttl: 2419200, // 28 days
    });

    console.log(`[SUCCESS] Push sent to user ${subscription.user_id}`);
    return { success: true };
  } catch (error) {
    console.error(`[ERROR] Failed to send push to ${subscription.user_id}:`, error);

    // Check if subscription is gone (HTTP 410)
    if (error instanceof webpush.PushMessageError && error.isGone()) {
      return {
        success: false,
        error: "Subscription expired (410 Gone)",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Helper: Initialize ApplicationServer with VAPID keys
async function initializeApplicationServer(): Promise<webpush.ApplicationServer> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured in environment");
  }

  // Decode base64url to raw bytes (for public key - URL-safe format)
  const decodeBase64Url = (str: string): Uint8Array => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const binaryString = atob(base64 + padding);
    return Uint8Array.from(binaryString, char => char.charCodeAt(0));
  };

  // Decode standard base64 to raw bytes (for private key - standard format)
  const decodeBase64 = (str: string): Uint8Array => {
    const binaryString = atob(str);
    return Uint8Array.from(binaryString, char => char.charCodeAt(0));
  };

  const publicKeyBytes = decodeBase64Url(VAPID_PUBLIC_KEY);
  const privateKeyBytes = decodeBase64(VAPID_PRIVATE_KEY);

  // Import keys using SubtleCrypto
  const publicKey = await crypto.subtle.importKey(
    "raw",
    publicKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );

  const vapidKeys: CryptoKeyPair = { publicKey, privateKey };

  // Generate ECDH keys for the application server
  const ecdhKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  // Create ApplicationServer instance
  return new webpush.ApplicationServer({
    contactInformation: "mailto:noreply@flomoon.app",
    vapidKeys,
    keys: ecdhKeys,
  });
}

// Helper: Get or create today's schedule
async function getTodaysSchedule(
  supabase: any,
  todayDate: string
): Promise<NotificationSchedule | null> {
  try {
    const { data, error } = await supabase.rpc("get_or_create_schedule", {
      p_date: todayDate,
    });

    if (error) {
      console.error("Failed to get schedule:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error("Error getting schedule:", error);
    return null;
  }
}

// Main handler
Deno.serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in UTC and Berlin
    const nowUTC = new Date();
    const nowBerlin = new Date(
      nowUTC.toLocaleString("en-US", { timeZone: BERLIN_TZ })
    );

    // Get minutes from midnight UTC
    const currentMinutesUTC = nowUTC.getUTCHours() * 60 + nowUTC.getUTCMinutes();

    // Get minutes from midnight Berlin
    const currentMinutesBerlin = nowBerlin.getHours() * 60 + nowBerlin.getMinutes();

    // Today's date in Berlin (for schedule lookup)
    const todayDateBerlin = nowBerlin.toISOString().split("T")[0];

    console.log(`[${nowUTC.toISOString()}] Job started`);
    console.log(`UTC time: ${nowUTC.getUTCHours()}:${String(nowUTC.getUTCMinutes()).padStart(2, '0')} (${currentMinutesUTC} min)`);
    console.log(`Berlin time: ${nowBerlin.getHours()}:${String(nowBerlin.getMinutes()).padStart(2, '0')} (${currentMinutesBerlin} min)`);

    // Get or create today's schedule
    const schedule = await getTodaysSchedule(supabase, todayDateBerlin);

    if (!schedule) {
      throw new Error("Failed to get notification schedule");
    }

    console.log("Schedule:", JSON.stringify(schedule));

    // Initialize ApplicationServer with VAPID keys
    const appServer = await initializeApplicationServer();

    let morningBriefSent = 0;
    let cycleNotificationsSent = 0;
    const results = [];

    // Check if we should send morning brief (7:15 Berlin = 6:15 UTC)
    const shouldSendMorningBrief =
      !schedule.morning_brief_sent &&
      currentMinutesUTC >= MORNING_BRIEF_TARGET_MINUTES_UTC &&
      currentMinutesUTC < MORNING_BRIEF_TARGET_MINUTES_UTC + MORNING_BRIEF_WINDOW_MINUTES;

    if (shouldSendMorningBrief) {
      console.log("=== SENDING MORNING BRIEF ===");

      // Fetch all enabled subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("enabled", true);

      if (subsError) {
        console.error("Failed to fetch subscriptions:", subsError);
      } else if (subscriptions && subscriptions.length > 0) {
        // Send morning brief to ALL users
        for (const subscription of subscriptions) {
          try {
            const result = await sendWebPush(
              appServer,
              subscription,
              fallbackMessages.morning_brief
            );

            if (result.success) {
              morningBriefSent++;
            } else if (result.error?.includes("410 Gone")) {
              // Delete expired subscription
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id);
            }

            results.push({
              user_id: subscription.user_id,
              type: "morning_brief",
              ...result,
            });
          } catch (error) {
            console.error(`Error sending morning brief to ${subscription.user_id}:`, error);
          }
        }

        // Mark morning brief as sent
        await supabase.rpc("mark_morning_brief_sent", {
          p_date: todayDateBerlin,
        });

        console.log(`Morning brief sent to ${morningBriefSent} users`);
      }
    }

    // Check if we should send cycle notifications (random time between 7:00-21:00 Berlin)
    const shouldSendCycleNotifications =
      !schedule.cycle_notification_sent &&
      currentMinutesBerlin >= schedule.cycle_notification_target_minutes;

    if (shouldSendCycleNotifications) {
      console.log("=== SENDING CYCLE NOTIFICATIONS ===");
      console.log(`Target time: ${Math.floor(schedule.cycle_notification_target_minutes / 60)}:${String(schedule.cycle_notification_target_minutes % 60).padStart(2, '0')} Berlin`);

      // Fetch all enabled subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("enabled", true);

      if (subsError) {
        console.error("Failed to fetch subscriptions:", subsError);
      } else if (subscriptions && subscriptions.length > 0) {
        // Send cycle notifications to users who have something interesting today
        for (const subscription of subscriptions) {
          try {
            // Fetch user's cycles
            const { data: cycles, error: cyclesError } = await supabase
              .from("cycles")
              .select("*")
              .eq("user_id", subscription.user_id)
              .order("start_date", { ascending: false });

            if (cyclesError || !cycles || cycles.length === 0) {
              continue;
            }

            // Determine notification type
            const notificationType = determineCycleNotificationType(cycles, nowBerlin);

            if (!notificationType) {
              continue;
            }

            // Send notification
            const result = await sendWebPush(appServer, subscription, notificationType);

            if (result.success) {
              cycleNotificationsSent++;
            } else if (result.error?.includes("410 Gone")) {
              // Delete expired subscription
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", subscription.id);
            }

            results.push({
              user_id: subscription.user_id,
              type: notificationType.type,
              ...result,
            });
          } catch (error) {
            console.error(`Error processing cycle notification for ${subscription.user_id}:`, error);
          }
        }

        // Mark cycle notification as sent
        await supabase.rpc("mark_cycle_notification_sent", {
          p_date: todayDateBerlin,
        });

        console.log(`Cycle notifications sent to ${cycleNotificationsSent} users`);
      }
    }

    const summary = {
      success: true,
      timestamp: nowUTC.toISOString(),
      berlin_time: `${nowBerlin.getHours()}:${String(nowBerlin.getMinutes()).padStart(2, '0')}`,
      morning_brief_sent: morningBriefSent,
      cycle_notifications_sent: cycleNotificationsSent,
      total_sent: morningBriefSent + cycleNotificationsSent,
      should_send_morning_brief: shouldSendMorningBrief,
      should_send_cycle_notifications: shouldSendCycleNotifications,
      schedule,
      results,
    };

    console.log("Job completed:", JSON.stringify(summary));

    return new Response(
      JSON.stringify(summary),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Push notification job failed:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
