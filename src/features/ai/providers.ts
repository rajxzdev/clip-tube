/**
 * BYOK provider & model catalog.
 *
 * Every provider here is a real, supported AI inference API. The client in
 * `client.ts` knows how to talk to each `kind`. Add a provider by appending to
 * `PROVIDERS` and wiring its `kind` in `client.ts` — the UI updates itself.
 *
 * All requests are made directly from the browser. Keys never touch a server.
 */

export type ProviderKind = "openai" | "gemini" | "anthropic";

export interface AiModel {
  /** The exact model id sent to the API. */
  id: string;
  /** Human label shown in the picker. */
  label: string;
  /** Short hint (context window / speed). Optional, display only. */
  hint?: string;
}

export interface AiProvider {
  id: string;
  label: string;
  /** Which request/response adapter the client should use. */
  kind: ProviderKind;
  /** Default API base URL. Users can override it in Advanced settings. */
  baseUrl: string;
  /** Where the user signs up / grabs an API key. */
  signupUrl: string;
  /** Expected prefix of a valid key — purely a UI hint. */
  keyHint?: string;
  models: AiModel[];
}

export const PROVIDERS: AiProvider[] = [
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    signupUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-",
    models: [
      { id: "gpt-4o", label: "GPT-4o", hint: "128k · multimodal" },
      { id: "gpt-4o-mini", label: "GPT-4o mini", hint: "128k · fast & cheap" },
      { id: "gpt-4.1", label: "GPT-4.1", hint: "1M context" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini", hint: "1M · fast" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 nano", hint: "1M · cheapest" },
      { id: "o4-mini", label: "o4-mini", hint: "reasoning" },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    kind: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    signupUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza…",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "2M · strongest" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "1M · fast" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", hint: "cheapest" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", hint: "1M" },
      { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", hint: "2M" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", hint: "1M" },
      { id: "gemini-1.5-flash-8b", label: "Gemini 1.5 Flash-8B", hint: "fast" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    signupUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", hint: "balanced" },
      { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1", hint: "strongest" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", hint: "fast & cheap" },
      { id: "claude-3-7-sonnet-latest", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    signupUrl: "https://console.groq.com/keys",
    keyHint: "gsk_",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", hint: "fast" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", hint: "ultra-fast" },
      { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B", hint: "reasoning" },
      { id: "qwen/qwen3-32b", label: "Qwen3 32B" },
      { id: "moonshotai/kimi-k2-instruct", label: "Kimi K2 Instruct" },
      { id: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    signupUrl: "https://openrouter.ai/settings/keys",
    keyHint: "sk-or-",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini (via OpenRouter)" },
      { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (via OpenRouter)" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (via OpenRouter)" },
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OpenRouter)" },
      { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 — free" },
      { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B — free" },
      { id: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B — free" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    signupUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "sk-",
    models: [
      { id: "deepseek-chat", label: "DeepSeek V3 Chat", hint: "general" },
      { id: "deepseek-reasoner", label: "DeepSeek R1 Reasoner", hint: "reasoning" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    signupUrl: "https://console.mistral.ai/api-keys",
    keyHint: "",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large", hint: "strongest" },
      { id: "mistral-small-latest", label: "Mistral Small", hint: "fast" },
      { id: "open-mistral-nemo", label: "Mistral Nemo", hint: "12B" },
      { id: "codestral-latest", label: "Codestral", hint: "code" },
      { id: "pixtral-12b-2409", label: "Pixtral 12B", hint: "vision" },
    ],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    signupUrl: "https://console.x.ai",
    keyHint: "xai-",
    models: [
      { id: "grok-4", label: "Grok 4" },
      { id: "grok-4-fast", label: "Grok 4 Fast" },
      { id: "grok-3", label: "Grok 3" },
      { id: "grok-3-fast", label: "Grok 3 Fast" },
      { id: "grok-2-vision-1212", label: "Grok 2 Vision", hint: "vision" },
    ],
  },
  {
    id: "together",
    label: "Together AI",
    kind: "openai",
    baseUrl: "https://api.together.xyz/v1",
    signupUrl: "https://api.together.ai/settings/api-keys",
    keyHint: "",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo" },
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", label: "Llama 3.1 8B Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen 2.5 72B Turbo" },
      { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
    ],
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    kind: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    signupUrl: "https://fireworks.ai/account/api-keys",
    keyHint: "fw_",
    models: [
      { id: "accounts/fireworks/models/llama-v3p3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "accounts/fireworks/models/qwen2p5-72b-instruct", label: "Qwen 2.5 72B" },
      { id: "accounts/fireworks/models/deepseek-v3", label: "DeepSeek V3" },
    ],
  },
  {
    id: "perplexity",
    label: "Perplexity",
    kind: "openai",
    baseUrl: "https://api.perplexity.ai",
    signupUrl: "https://www.perplexity.ai/settings/api",
    keyHint: "pplx-",
    models: [
      { id: "sonar-pro", label: "Sonar Pro", hint: "search" },
      { id: "sonar", label: "Sonar", hint: "fast" },
      { id: "sonar-reasoning-pro", label: "Sonar Reasoning Pro" },
      { id: "sonar-deep-research", label: "Sonar Deep Research" },
    ],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    kind: "openai",
    baseUrl: "",
    signupUrl: "",
    keyHint: "",
    models: [],
  },
];

const PROVIDER_BY_ID = new Map(PROVIDERS.map((provider) => [provider.id, provider]));

export function getProvider(providerId: string): AiProvider | null {
  return PROVIDER_BY_ID.get(providerId) ?? null;
}

/** Looks up which provider a catalog model id belongs to. */
export function findProviderForModel(modelId: string): AiProvider | null {
  for (const provider of PROVIDERS) {
    if (provider.models.some((model) => model.id === modelId)) return provider;
  }
  return null;
}

/** Flattened list of every supported model with its owning provider — feeds the picker. */
export interface CatalogEntry {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  hint?: string;
}

export const CATALOG: CatalogEntry[] = PROVIDERS.flatMap((provider) =>
  provider.models.map((model) => {
    const entry: CatalogEntry = {
      providerId: provider.id,
      providerLabel: provider.label,
      modelId: model.id,
      modelLabel: model.label,
    };
    if (model.hint) entry.hint = model.hint;
    return entry;
  }),
);

/** Normalised searchable string used for the fuzzy picker filter. */
export function entrySearchText(entry: CatalogEntry): string {
  return `${entry.providerLabel} ${entry.modelLabel} ${entry.modelId}`.toLowerCase();
}

/**
 * Forgiving token match: every whitespace-separated token in the query (after
 * stripping punctuation) must appear somewhere in the entry. So "google gem",
 * "google gem-", "gemini 2.5" and "groq llama" all resolve to the right models.
 */
export function matchesCatalog(entry: CatalogEntry, query: string): boolean {
  const normalised = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  if (!normalised) return true;
  const hay = entrySearchText(entry).replace(/[^a-z0-9]+/g, " ");
  return normalised.split(/\s+/).every((token) => token.length > 0 && hay.includes(token));
}
