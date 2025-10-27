/**
 * Unified AI API client with automatic fallback from Claude to OpenAI
 * Supports hybrid mode: direct API (local dev) or Supabase Edge Functions (production)
 */

import { supabase } from '../lib/supabaseClient';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIRequestOptions {
  system?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  claudeApiKey?: string;
  claudeProxyUrl?: string;
  openAIApiKey?: string;
  openAIProxyUrl?: string;
  preferOpenAI?: boolean; // Если true, сначала пробует OpenAI, затем Claude
  useGPT4oMini?: boolean; // Если true, использует gpt-4o-mini вместо gpt-4o
}

interface AIResponse {
  text: string;
  provider: 'claude' | 'openai';
}

/**
 * Call Supabase Edge Function (server-side AI API proxy)
 * No CORS issues, API keys stored in Supabase Secrets
 */
async function callSupabaseEdgeFunction(
  options: AIRequestOptions
): Promise<AIResponse> {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    preferOpenAI = false,
  } = options;

  const { data, error } = await supabase.functions.invoke('generate-ai-content', {
    body: {
      system,
      messages,
      temperature,
      maxTokens,
      preferOpenAI,
    }
  });

  if (error) {
    throw new Error(`Edge Function error: ${error.message}`);
  }

  if (!data || !data.text) {
    throw new Error('Edge Function returned empty response');
  }

  return {
    text: data.text,
    provider: data.provider || 'claude',
  };
}

async function callClaudeAPI(
  options: AIRequestOptions
): Promise<string> {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    signal,
    claudeApiKey,
    claudeProxyUrl,
  } = options;

  const proxyUrl = (claudeProxyUrl || process.env.REACT_APP_CLAUDE_PROXY_URL || '').trim();

  const payload = {
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    temperature,
    system,
    messages: messages.filter(m => m.role !== 'system'),
  };

  if (proxyUrl) {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude proxy error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new Error('Claude proxy returned empty response');
    }

    return text;
  }

  const key = (claudeApiKey || '').trim() || process.env.REACT_APP_CLAUDE_API_KEY;
  if (!key) {
    throw new Error('Claude API key not available');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    throw new Error('Claude returned empty response');
  }

  return text;
}

async function callOpenAIAPI(
  options: AIRequestOptions
): Promise<string> {
  const {
    system,
    messages,
    temperature = 0.8,
    maxTokens = 500,
    signal,
    openAIApiKey,
    openAIProxyUrl,
    useGPT4oMini = true
  } = options;

  const proxyUrl = (openAIProxyUrl || process.env.REACT_APP_OPENAI_PROXY_URL || '').trim();
  const key = (openAIApiKey || '').trim() || process.env.REACT_APP_OPENAI_API_KEY;

  const allMessages: AIMessage[] = [];
  if (system) {
    allMessages.push({ role: 'system', content: system });
  }
  allMessages.push(...messages);

  // Используем gpt-4o-mini по умолчанию для скорости и дешевизны
  const model = useGPT4oMini ? 'gpt-4o-mini' : 'gpt-4o';

  const payload = {
    model,
    messages: allMessages,
    temperature,
    max_tokens: maxTokens,
  };

  // Если есть proxy, используем его (не нужен API ключ в заголовках)
  // Иначе идем напрямую к OpenAI
  const endpoint = proxyUrl || 'https://api.openai.com/v1/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Добавляем Authorization только если идем напрямую (без proxy)
  if (!proxyUrl) {
    if (!key) {
      throw new Error('OpenAI API key not available and no proxy configured');
    }
    headers['Authorization'] = `Bearer ${key}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('OpenAI returned empty response');
  }

  return text;
}

/**
 * Calls AI API with automatic fallback.
 *
 * Hybrid mode (controlled by REACT_APP_USE_EDGE_FUNCTIONS):
 * - true: Supabase Edge Function (production - secure, no CORS)
 * - false: Direct API calls (local dev - fast, requires API keys in .env.local)
 *
 * Direct API mode (REACT_APP_USE_EDGE_FUNCTIONS=false):
 * - By default: Claude first, then OpenAI
 * - With preferOpenAI: OpenAI first (with gpt-4o-mini), then Claude
 */
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  const useEdgeFunctions = process.env.REACT_APP_USE_EDGE_FUNCTIONS === 'true';

  console.log('[AI Client] Attempting to call AI with options:', {
    mode: useEdgeFunctions ? 'edge-functions' : 'direct-api',
    hasClaudeKey: Boolean(options.claudeApiKey || process.env.REACT_APP_CLAUDE_API_KEY),
    hasClaudeProxy: Boolean(options.claudeProxyUrl || process.env.REACT_APP_CLAUDE_PROXY_URL),
    hasOpenAIKey: Boolean(options.openAIApiKey || process.env.REACT_APP_OPENAI_API_KEY),
    hasOpenAIProxy: Boolean(options.openAIProxyUrl || process.env.REACT_APP_OPENAI_PROXY_URL),
    preferOpenAI: Boolean(options.preferOpenAI),
    useGPT4oMini: Boolean(options.useGPT4oMini),
  });

  // Production mode: Use Supabase Edge Functions (no CORS, secure)
  if (useEdgeFunctions) {
    console.log('[AI Client] 🚀 Using Supabase Edge Function (production mode)');
    return await callSupabaseEdgeFunction(options);
  }

  // Local dev mode: Direct API calls with fallback (below)

  // Если установлен preferOpenAI, пробуем OpenAI первым
  if (options.preferOpenAI) {
    try {
      const text = await callOpenAIAPI(options);
      console.log('[AI Client] ✅ OpenAI API succeeded (primary)');
      return { text, provider: 'openai' };
    } catch (openAIError) {
      console.warn('[AI Client] ❌ OpenAI API failed, falling back to Claude:', openAIError);

      // Fallback to Claude
      try {
        const text = await callClaudeAPI(options);
        console.log('[AI Client] ✅ Claude API succeeded (fallback)');
        return { text, provider: 'claude' };
      } catch (claudeError) {
        console.error('[AI Client] ❌ Claude API also failed:', claudeError);
        throw new Error(`Both AI providers failed. OpenAI: ${openAIError instanceof Error ? openAIError.message : 'Unknown error'}. Claude: ${claudeError instanceof Error ? claudeError.message : 'Unknown error'}`);
      }
    }
  }

  // По умолчанию: Try Claude first (primary provider)
  try {
    const text = await callClaudeAPI(options);
    console.log('[AI Client] ✅ Claude API succeeded (primary)');
    return { text, provider: 'claude' };
  } catch (claudeError) {
    console.warn('[AI Client] ❌ Claude API failed, falling back to OpenAI:', claudeError);

    // Fallback to OpenAI
    try {
      const text = await callOpenAIAPI(options);
      console.log('[AI Client] ✅ OpenAI API succeeded (fallback)');
      return { text, provider: 'openai' };
    } catch (openAIError) {
      console.error('[AI Client] ❌ OpenAI API also failed:', openAIError);
      throw new Error(`Both AI providers failed. Claude: ${claudeError instanceof Error ? claudeError.message : 'Unknown error'}. OpenAI: ${openAIError instanceof Error ? openAIError.message : 'Unknown error'}`);
    }
  }
}
