import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types
interface PushSubscription {
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

interface PushNotification {
  title: string;
  body: string;
  url?: string;
}

interface NotificationType {
  type: string;
  title: string;
  body: string;
  url: string;
}

// VAPID keys from environment
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

// Constants
const APP_BASE_URL = "https://segigu.github.io/flomoon/";
const NOTIFICATIONS_URL = `${APP_BASE_URL}?open=notifications`;
const MORNING_BRIEF_URL = `${APP_BASE_URL}?open=daily-horoscope`;
const BERLIN_TZ = "Europe/Berlin";
const MS_IN_DAY = 24 * 60 * 60 * 1000;

// Fallback messages (same as in scripts/sendNotifications.js)
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
  period_start: {
    type: "period_start",
    title: "Марфа Кровякова",
    body: "Настёна, поток начался, грелку в зубы, плед на диван, сериал в телек! 🩸🛋️",
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

// Helper: Determine notification type for today
function determineNotificationType(
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

// Helper: Send Web Push notification using Web Crypto API
async function sendWebPush(
  subscription: PushSubscription,
  notification: NotificationType
): Promise<boolean> {
  try {
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      url: notification.url,
      icon: "/logo192.png",
      badge: "/logo192.png",
    });

    // TODO: Implement Web Push encryption using Web Crypto API
    // For now, return false to skip actual sending
    // This requires VAPID signing and ECDH encryption
    console.log(
      `[DRY RUN] Would send push to ${subscription.user_id}:`,
      payload
    );

    return false; // Placeholder until Web Push implementation
  } catch (error) {
    console.error(`Failed to send push to ${subscription.user_id}:`, error);
    return false;
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

    // Get today's date in Berlin timezone
    const today = new Date();
    const berlinTime = new Date(
      today.toLocaleString("en-US", { timeZone: BERLIN_TZ })
    );

    console.log(`[${berlinTime.toISOString()}] Starting push notification job`);

    // 1. Fetch all enabled push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("enabled", true);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active subscriptions" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} active subscriptions`);

    // 2. Process each subscription
    let sentCount = 0;
    const results = [];

    for (const subscription of subscriptions) {
      try {
        // Fetch user's cycles
        const { data: cycles, error: cyclesError } = await supabase
          .from("cycles")
          .select("*")
          .eq("user_id", subscription.user_id)
          .order("start_date", { ascending: false });

        if (cyclesError) {
          console.error(
            `Failed to fetch cycles for user ${subscription.user_id}:`,
            cyclesError
          );
          continue;
        }

        if (!cycles || cycles.length === 0) {
          console.log(`No cycles found for user ${subscription.user_id}`);
          continue;
        }

        // Determine notification type
        const notificationType = determineNotificationType(cycles, berlinTime);

        if (!notificationType) {
          console.log(`No notification needed for user ${subscription.user_id}`);
          continue;
        }

        // Send push notification
        const success = await sendWebPush(subscription, notificationType);

        if (success) {
          sentCount++;
        }

        results.push({
          user_id: subscription.user_id,
          type: notificationType.type,
          success,
        });
      } catch (error) {
        console.error(
          `Error processing subscription ${subscription.id}:`,
          error
        );
        results.push({
          user_id: subscription.user_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`Sent ${sentCount} notifications out of ${results.length} attempts`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: results.length,
        results,
      }),
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
