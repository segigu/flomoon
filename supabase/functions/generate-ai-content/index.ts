import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Types
interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface GenerateAIContentRequest {
  system?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  preferOpenAI?: boolean;
}

interface AIResponse {
  text: string;
  provider: "claude" | "openai";
}

// Call Claude API
async function callClaudeAPI(
  system: string | undefined,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");

  if (!claudeApiKey) {
    throw new Error("Claude API key not configured");
  }

  const payload = {
    model: "claude-haiku-4-5",
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.filter((m) => m.role !== "system"),
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    throw new Error("Claude returned empty response");
  }

  return text;
}

// Call OpenAI API
async function callOpenAIAPI(
  system: string | undefined,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openAIApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const allMessages: AIMessage[] = [];
  if (system) {
    allMessages.push({ role: "system", content: system });
  }
  allMessages.push(...messages);

  const payload = {
    model: "gpt-4o-mini",
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAIApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI returned empty response");
  }

  return text;
}

// Main AI request with fallback
async function generateAIContent(request: GenerateAIContentRequest): Promise<AIResponse> {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    preferOpenAI = false,
  } = request;

  // Try primary provider first
  const primaryProvider = preferOpenAI ? "openai" : "claude";
  const fallbackProvider = preferOpenAI ? "claude" : "openai";

  try {
    if (primaryProvider === "claude") {
      const text = await callClaudeAPI(system, messages, temperature, maxTokens);
      return { text, provider: "claude" };
    } else {
      const text = await callOpenAIAPI(system, messages, temperature, maxTokens);
      return { text, provider: "openai" };
    }
  } catch (primaryError) {
    console.warn(
      `Primary provider (${primaryProvider}) failed, trying fallback (${fallbackProvider}):`,
      primaryError
    );

    // Try fallback provider
    try {
      if (fallbackProvider === "claude") {
        const text = await callClaudeAPI(system, messages, temperature, maxTokens);
        return { text, provider: "claude" };
      } else {
        const text = await callOpenAIAPI(system, messages, temperature, maxTokens);
        return { text, provider: "openai" };
      }
    } catch (fallbackError) {
      console.error(`Fallback provider (${fallbackProvider}) also failed:`, fallbackError);
      throw new Error(
        `Both AI providers failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
      );
    }
  }
}

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

    // Parse request body
    const requestData: GenerateAIContentRequest = await req.json();

    // Validate request
    if (!requestData.messages || !Array.isArray(requestData.messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Generate AI content
    const result = await generateAIContent(requestData);

    return new Response(JSON.stringify(result), {
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
