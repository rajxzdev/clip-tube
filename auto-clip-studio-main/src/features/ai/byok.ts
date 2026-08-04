/**
 * BYOK (Bring Your Own Key) state.
 *
 * Stores the active model + a key (and optional base-URL override) per provider
 * in `localStorage`. The store is SSR-safe: server snapshots return an empty
 * default, the real state is read/written only in the browser.
 */
import { useSyncExternalStore } from "react";
import { CATALOG, findProviderForModel, getProvider } from "./providers";

const STORAGE_KEY = "autoclip-byok-v1";

export interface ProviderCredentials {
  apiKey: string;
  /** Overrides the provider's default base URL. Empty string = use default. */
  baseUrl: string;
  /** Model id to use when this is the `custom` provider (no catalog models). */
  customModel: string;
}

export interface ByokState {
  /** Active model id from the catalog (drives the active provider). */
  activeModelId: string | null;
  keys: Record<string, ProviderCredentials>;
}

const EMPTY_STATE: ByokState = { activeModelId: null, keys: {} };

let state: ByokState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function read(): ByokState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<ByokState>;
    return {
      activeModelId: typeof parsed.activeModelId === "string" ? parsed.activeModelId : null,
      keys:
        parsed.keys && typeof parsed.keys === "object" ? (parsed.keys as ByokState["keys"]) : {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

function persist(next: ByokState): void {
  state = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — keep in-memory state, skip persisting */
    }
  }
  emit();
}

/** Called once on the client to hydrate from localStorage. */
function ensureLoaded(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = read();
}

// Hydrate eagerly on the client so the first render already reflects stored keys.
ensureLoaded();

function subscribe(listener: () => void): () => void {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ByokState {
  return state;
}

function getServerSnapshot(): ByokState {
  return EMPTY_STATE;
}

/** React hook returning the full BYOK state. Triggers re-renders on change. */
export function useByok(): ByokState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ----------------------------- mutations ----------------------------- */

export function setActiveModel(modelId: string): void {
  ensureLoaded();
  persist({ ...state, activeModelId: modelId });
}

export function setApiKey(providerId: string, apiKey: string): void {
  ensureLoaded();
  const previous = state.keys[providerId] ?? { apiKey: "", baseUrl: "", customModel: "" };
  persist({
    ...state,
    keys: { ...state.keys, [providerId]: { ...previous, apiKey } },
  });
}

export function setBaseUrl(providerId: string, baseUrl: string): void {
  ensureLoaded();
  const previous = state.keys[providerId] ?? { apiKey: "", baseUrl: "", customModel: "" };
  persist({
    ...state,
    keys: { ...state.keys, [providerId]: { ...previous, baseUrl } },
  });
}

export function setCustomModel(providerId: string, customModel: string): void {
  ensureLoaded();
  const previous = state.keys[providerId] ?? { apiKey: "", baseUrl: "", customModel: "" };
  persist({
    ...state,
    keys: { ...state.keys, [providerId]: { ...previous, customModel } },
  });
}

export function clearProvider(providerId: string): void {
  ensureLoaded();
  const next = { ...state.keys };
  delete next[providerId];
  persist({ ...state, keys: next });
}

/* ----------------------------- selectors ----------------------------- */

export interface ActiveSelection {
  providerId: string;
  modelId: string;
  baseUrl: string;
  apiKey: string;
  /** True when there's a usable key for the active provider. */
  ready: boolean;
}

/**
 * Resolves the active model/provider/credentials from the catalog plus stored
 * keys. Returns null when no model is chosen or the provider can't be resolved
 * (e.g. a stale model id after an upgrade).
 */
export function resolveActive(current: ByokState = read()): ActiveSelection | null {
  if (!current.activeModelId) return null;

  // Custom-provider models are encoded as `custom:<id>`.
  if (current.activeModelId.startsWith("custom:")) {
    const custom = getProvider("custom");
    if (!custom) return null;
    const creds = current.keys["custom"];
    const modelId = current.activeModelId.slice("custom:".length);
    return {
      providerId: "custom",
      modelId,
      baseUrl: creds?.baseUrl || custom.baseUrl,
      apiKey: creds?.apiKey ?? "",
      ready: Boolean(creds?.apiKey && modelId),
    };
  }

  const provider = findProviderForModel(current.activeModelId);
  if (!provider) return null;
  const creds = current.keys[provider.id];
  return {
    providerId: provider.id,
    modelId: current.activeModelId,
    baseUrl: creds?.baseUrl || provider.baseUrl,
    apiKey: creds?.apiKey ?? "",
    ready: Boolean(creds?.apiKey),
  };
}

export const CATALOG_MODELS = CATALOG;
