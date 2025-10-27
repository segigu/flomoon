import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types
interface CycleData {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
}

interface CycleStats {
  averageLength: number;
  lastCycleLength: number;
  cycleCount: number;
  nextPrediction: string;
  averageLength6Months: number;
  variability: number;
  trend: number;
  predictionConfidence: number;
}

// Helper: Calculate difference in days
const diffInDays = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper: Add days to date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Helper: Calculate standard deviation
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
};

// Helper: Calculate linear trend
const calculateTrend = (values: number[]): number => {
  if (values.length < 2) return 0;

  const n = values.length;
  const xValues = Array.from({ length: n }, (_, i) => i);
  const xSum = xValues.reduce((sum, x) => sum + x, 0);
  const ySum = values.reduce((sum, y) => sum + y, 0);
  const xySum = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
  const x2Sum = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  return slope;
};

// Main calculation function
const calculateCycleStats = (cycles: CycleData[]): CycleStats => {
  if (cycles.length === 0) {
    return {
      averageLength: 28,
      lastCycleLength: 0,
      cycleCount: 0,
      nextPrediction: addDays(new Date(), 28).toISOString(),
      averageLength6Months: 28,
      variability: 0,
      trend: 0,
      predictionConfidence: 0,
    };
  }

  const sortedCycles = [...cycles].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  // Calculate cycle lengths
  const cycleLengths: number[] = [];
  for (let i = 1; i < sortedCycles.length; i++) {
    const length = diffInDays(
      new Date(sortedCycles[i - 1].start_date),
      new Date(sortedCycles[i].start_date)
    );
    cycleLengths.push(length);
  }

  // Recent cycles (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentCycles = sortedCycles.filter(
    (cycle) => new Date(cycle.start_date) >= sixMonthsAgo
  );

  const recentLengths: number[] = [];
  for (let i = 1; i < recentCycles.length; i++) {
    const length = diffInDays(
      new Date(recentCycles[i - 1].start_date),
      new Date(recentCycles[i].start_date)
    );
    recentLengths.push(length);
  }

  const averageLength =
    cycleLengths.length > 0
      ? Math.round(cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length)
      : 28;

  const averageLength6Months =
    recentLengths.length > 0
      ? Math.round(recentLengths.reduce((sum, length) => sum + length, 0) / recentLengths.length)
      : averageLength;

  const variability = calculateStdDev(recentLengths.length > 0 ? recentLengths : cycleLengths);

  // Trend based on last 3-6 cycles
  const trendCycles = cycleLengths.slice(-6);
  const trend = calculateTrend(trendCycles);

  // Prediction confidence
  let predictionConfidence = 0;
  if (recentLengths.length >= 3) {
    const baseConfidence = Math.min(recentLengths.length * 15, 70);
    const variabilityPenalty = Math.min(variability * 5, 30);
    predictionConfidence = Math.max(0, Math.min(100, baseConfidence - variabilityPenalty));
  }

  const lastCycleLength = cycleLengths.length > 0 ? cycleLengths[cycleLengths.length - 1] : 0;
  const lastCycleDate = new Date(sortedCycles[sortedCycles.length - 1].start_date);
  const nextPrediction = addDays(lastCycleDate, averageLength6Months || averageLength);

  return {
    averageLength,
    lastCycleLength,
    cycleCount: cycles.length,
    nextPrediction: nextPrediction.toISOString(),
    averageLength6Months,
    variability: Math.round(variability * 10) / 10,
    trend: Math.round(trend * 100) / 100,
    predictionConfidence: Math.round(predictionConfidence),
  };
};

Deno.serve(async (req) => {
  try {
    // CORS headers
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch user's cycles from database
    const { data: cycles, error: dbError } = await supabase
      .from("cycles")
      .select("*")
      .eq("user_id", user.id)
      .order("start_date", { ascending: true });

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(JSON.stringify({ error: "Database error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calculate statistics
    const stats = calculateCycleStats(cycles || []);

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
