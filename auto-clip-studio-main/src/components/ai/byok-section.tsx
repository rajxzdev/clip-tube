"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ModelPicker } from "@/components/ai/model-picker";
import { getProvider, PROVIDERS } from "@/features/ai/providers";
import {
  clearProvider,
  resolveActive,
  setApiKey,
  setActiveModel,
  setBaseUrl,
  setCustomModel,
  useByok,
} from "@/features/ai/byok";
import { AiRequestError, chatWith, resolveProvider } from "@/features/ai/client";
import { cn } from "@/lib/utils";

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function KeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type={reveal ? "text" : "password"}
        value={value}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl px-9"
      />
      <button
        type="button"
        aria-label={reveal ? "Hide key" : "Show key"}
        onClick={() => setReveal((current) => !current)}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function ByokSection() {
  const mounted = useMounted();
  const byok = useByok();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  const active = mounted ? resolveActive(byok) : null;
  const activeProvider = active ? getProvider(active.providerId) : null;
  const isCustom = active?.providerId === "custom";
  const customCreds = byok.keys["custom"];

  const setKey = (providerId: string, value: string) => setApiKey(providerId, value);
  const setUrl = (providerId: string, value: string) => setBaseUrl(providerId, value);
  const setCustomModelId = (value: string) => {
    setCustomModel("custom", value);
    // Keep the active selection's model id in sync while the custom provider is active.
    if (byok.activeModelId?.startsWith("custom:") && value.trim()) {
      setActiveModel(`custom:${value.trim()}`);
    }
  };

  const testConnection = async () => {
    const provider = resolveProvider();
    if (!provider) {
      toast.error("Add an API key for the active provider first.");
      return;
    }
    setTesting(true);
    try {
      await chatWith(provider, [{ role: "user", content: "Reply with exactly: ok" }], {
        maxTokens: 8,
        temperature: 0,
      });
      toast.success(`${activeProvider?.label ?? "Provider"} connected — model is live.`);
    } catch (error) {
      const message =
        error instanceof AiRequestError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Connection failed";
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-3xl glass p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">AI providers (BYOK)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bring your own key. Keys are stored only in this browser and sent straight to the
            provider.
          </p>
        </div>
        {active ? (
          <Badge variant={active.ready ? "default" : "secondary"} className="rounded-full">
            {active.ready ? "AI ready" : "Needs key"}
          </Badge>
        ) : (
          <Badge variant="secondary" className="rounded-full">
            Off
          </Badge>
        )}
      </div>

      <div className="mt-4">
        <Label className="text-xs text-muted-foreground">Active model</Label>
        <ModelPicker className="mt-2" />
        {active && activeProvider ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {active.ready
              ? `Routing through ${activeProvider.label} · ${active.modelId}`
              : `Add a ${activeProvider.label} API key below to enable AI features.`}
          </p>
        ) : null}
      </div>

      {active && activeProvider ? (
        <div className="mt-5 flex flex-col gap-4">
          {isCustom ? (
            <>
              <div>
                <Label htmlFor="custom-base" className="text-xs text-muted-foreground">
                  Base URL
                </Label>
                <Input
                  id="custom-base"
                  value={customCreds?.baseUrl ?? ""}
                  placeholder="http://localhost:11434/v1"
                  onChange={(event) => setUrl("custom", event.target.value)}
                  className="mt-2 rounded-2xl"
                />
              </div>
              <div>
                <Label htmlFor="custom-model" className="text-xs text-muted-foreground">
                  Model id
                </Label>
                <Input
                  id="custom-model"
                  value={customCreds?.customModel ?? ""}
                  placeholder="llama3.1 / gpt-4o-mini / qwen2.5"
                  onChange={(event) => setCustomModelId(event.target.value)}
                  className="mt-2 rounded-2xl"
                />
              </div>
            </>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="api-key" className="text-xs text-muted-foreground">
                {activeProvider.label} API key
              </Label>
              {activeProvider.signupUrl ? (
                <a
                  href={activeProvider.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Get a key <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
            <div className="mt-2">
              <KeyInput
                value={
                  isCustom
                    ? (customCreds?.apiKey ?? "")
                    : (byok.keys[active.providerId]?.apiKey ?? "")
                }
                placeholder={
                  activeProvider.keyHint ? `${activeProvider.keyHint}…` : "Paste your API key"
                }
                onChange={(value) => setKey(active.providerId, value)}
              />
            </div>
          </div>

          {!isCustom ? (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full px-2 text-xs text-muted-foreground"
                >
                  <ChevronDown
                    className={cn("size-3 transition-transform", advancedOpen && "rotate-180")}
                  />
                  Advanced
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <Label htmlFor="base-url" className="text-xs text-muted-foreground">
                  Base URL override (optional)
                </Label>
                <Input
                  id="base-url"
                  value={byok.keys[active.providerId]?.baseUrl ?? ""}
                  placeholder={activeProvider.baseUrl}
                  onChange={(event) => setUrl(active.providerId, event.target.value)}
                  className="mt-2 rounded-2xl"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Point at a proxy, gateway or self-host if you don't call the provider directly.
                </p>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={testConnection}
              disabled={testing || !active.ready}
              className="rounded-full"
              size="sm"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
              Test connection
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-destructive"
              onClick={() => {
                clearProvider(active.providerId);
                toast.success(`${activeProvider.label} key cleared`);
              }}
            >
              <Trash2 className="size-4" /> Clear key
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
          Pick a model above to add its API key. AutoClip AI will use it to re-rank highlights and
          write clip titles, captions & hashtags.
        </p>
      )}

      <Collapsible
        open={rosterOpen}
        onOpenChange={setRosterOpen}
        className="mt-5 border-t border-border pt-4"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-2 text-xs text-muted-foreground"
          >
            <ChevronDown
              className={cn("size-3 transition-transform", rosterOpen && "rotate-180")}
            />
            Manage all providers
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PROVIDERS.filter((provider) => provider.id !== "custom").map((provider) => {
              const creds = byok.keys[provider.id];
              const hasKey = Boolean(creds?.apiKey);
              return (
                <li
                  key={provider.id}
                  className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{provider.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {provider.models.length} models
                    </p>
                  </div>
                  {hasKey ? (
                    <Badge variant="secondary" className="rounded-full">
                      <Check className="mr-1 size-3" /> Key set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full">
                      No key
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
