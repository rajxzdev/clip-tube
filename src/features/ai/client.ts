/**
 * Thin chat-completion client that talks directly to the user's chosen provider.
 *
 * Three request shapes are supported (`ProviderKind`):
 *   - `openai`     : /chat/completions  (OpenAI, Groq, OpenRouter, DeepSeek, …)
 *   - `gemini`     : /models/{model}:generateContent
 *   - `anthropic`  : /messages  (needs the browser-access header)
 *
 * Every call is made with `fetch` from the browser; nothing is proxied.
 */
import { getProvider, type ProviderKind } from "./providers";
import { resolveActive, type ByokState } from "./byok";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Ask the model to return a JSON object (best-effort on Anthropic). */
  json?: boolean;
  signal?: AbortSignal;
}

export interface ResolvedProvider {
  providerId: string;
  kind: ProviderKind;
  modelId: string;
  baseUrl: string;
  apiKey: string;
}

export class AiRequestError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "AiRequestError";
    this.status = status;
  }
}

/** Resolve the active provider from the live BYOK state for a request. */
export function resolveProvider(state?: ByokState): ResolvedProvider | null {
  const active = resolveActive(state);
  if (!active || !active.ready) return null;
  // The custom provider id always maps to the openai kind.
  const kind: ProviderKind =
    active.providerId === "custom" ? "openai" : (kindFor(active.providerId) ?? "openai");
  return {
    providerId: active.providerId,
    kind,
    modelId: active.modelId,
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
  };
}

function kindFor(providerId: string): ProviderKind | null {
  const provider = getProvider(providerId);
  return provider?.kind ?? null;
}

/** Sends a chat request and returns the assistant's text reply. */
export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<string> {
  const provider = resolveProvider();
  if (!provider) {
    throw new AiRequestError("No AI provider configured. Add a model and API key in Settings.");
  }
  return chatWith(provider, messages, opts);
}

/** Same as {@link chat} but with an explicitly resolved provider (e.g. testing). */
export async function chatWith(
  provider: ResolvedProvider,
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  switch (provider.kind) {
    case "gemini":
      return chatGemini(provider, messages, opts);
    case "anthropic":
      return chatAnthropic(provider, messages, opts);
    case "openai":
    default:
      return chatOpenAI(provider, messages, opts);
  }
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    const message = parsed.error?.message ?? parsed.message;
    if (message) return message;
  } catch {
    /* fall through to raw text */
  }
  return text.trim() || response.statusText || `HTTP ${response.status}`;
}

/** POST JSON, returning the raw Response. Keeps `signal` handling optional-safe. */
async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const init: RequestInit = { method: "POST", headers, body: JSON.stringify(body) };
  if (signal) init.signal = signal;
  return fetch(url, init);
}

/* ------------------------------ OpenAI ------------------------------ */

async function chatOpenAI(
  provider: ResolvedProvider,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string> {
  const url = joinUrl(provider.baseUrl, "/chat/completions");
  const body: Record<string, unknown> = {
    model: provider.modelId,
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.maxTokens) body["max_tokens"] = opts.maxTokens;
  if (opts.json) body["response_format"] = { type: "json_object" };

  const response = await postJson(
    url,
    { "Content-Type": "application/json", Authorization: `Bearer ${provider.apiKey}` },
    body,
    opts.signal,
  );

  if (!response.ok) throw new AiRequestError(await readError(response), response.status);
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiRequestError("Empty response from provider.");
  return content.trim();
}

/* ------------------------------ Gemini ------------------------------ */

async function chatGemini(
  provider: ResolvedProvider,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string> {
  const url = joinUrl(provider.baseUrl, `/models/${provider.modelId}:generateContent`);
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const body: Record<string, unknown> = {
    contents: turns,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (system) body["systemInstruction"] = { parts: [{ text: system }] };

  const response = await postJson(
    url,
    { "Content-Type": "application/json", "x-goog-api-key": provider.apiKey },
    body,
    opts.signal,
  );

  if (!response.ok) throw new AiRequestError(await readError(response), response.status);
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
  if (!text) throw new AiRequestError("Empty response from provider.");
  return text.trim();
}

/* ----------------------------- Anthropic ----------------------------- */

async function chatAnthropic(
  provider: ResolvedProvider,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string> {
  const url = joinUrl(provider.baseUrl, "/messages");
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));

  const body: Record<string, unknown> = {
    model: provider.modelId,
    messages: turns,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.7,
  };
  if (system) body["system"] = system;

  const response = await postJson(
    url,
    {
      "Content-Type": "application/json",
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      // Required to allow direct browser calls.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body,
    opts.signal,
  );

  if (!response.ok) throw new AiRequestError(await readError(response), response.status);
  const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new AiRequestError("Empty response from provider.");
  return text.trim();
}

function joinUrl(base: string, path: string): string {
  if (!base) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

/* --------------------------- JSON helpers --------------------------- */

/** Extracts a JSON object/array from a possibly fenced or chatty model reply. */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* try to slice the first balanced JSON value */
  }
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  if (end > start) {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  }
  throw new Error("Could not parse JSON from model response");
}
