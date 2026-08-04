"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CATALOG, getProvider, matchesCatalog, type CatalogEntry } from "@/features/ai/providers";
import { setActiveModel, useByok } from "@/features/ai/byok";

function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function activeLabel(activeModelId: string | null): string {
  if (!activeModelId) return "Select a model…";
  if (activeModelId.startsWith("custom:")) {
    return `Custom — ${activeModelId.slice("custom:".length) || "configure"}`;
  }
  const entry = CATALOG.find((item) => item.modelId === activeModelId);
  return entry ? `${entry.providerLabel} · ${entry.modelLabel}` : activeModelId;
}

export function ModelPicker({ className }: { className?: string }) {
  const mounted = useMounted();
  const byok = useByok();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo<CatalogEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATALOG;
    return CATALOG.filter((entry) => matchesCatalog(entry, q));
  }, [query]);

  // Group results by provider, preserving the catalog's provider order.
  const groups = useMemo(() => {
    const map = new Map<string, CatalogEntry[]>();
    for (const entry of filtered) {
      const list = map.get(entry.providerId) ?? [];
      list.push(entry);
      map.set(entry.providerId, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const customCreds = byok.keys["custom"];
  const customVisible =
    !query.trim() ||
    "custom (openai-compatible)".includes(query.trim().toLowerCase()) ||
    "custom".includes(query.trim().toLowerCase());

  const handleSelect = (value: string) => {
    setActiveModel(value);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-11 w-full justify-between rounded-2xl font-normal", className)}
        >
          <span className="truncate">
            {mounted ? activeLabel(byok.activeModelId) : "Select a model…"}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false} loop>
          <CommandInput
            placeholder="Search provider or model — e.g. “google gem”"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No supported model matches “{query}”.</CommandEmpty>
            {groups.map(([providerId, entries]) => {
              const provider = getProvider(providerId);
              return (
                <CommandGroup key={providerId} heading={provider?.label ?? providerId}>
                  {entries.map((entry) => (
                    <CommandItem
                      key={`${entry.providerId}-${entry.modelId}`}
                      value={`${entry.providerLabel} ${entry.modelLabel} ${entry.modelId}`}
                      onSelect={() => handleSelect(entry.modelId)}
                      className="gap-2"
                    >
                      <Check
                        className={cn(
                          "size-4",
                          byok.activeModelId === entry.modelId ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="flex-1 truncate">
                        {entry.modelLabel}
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {entry.modelId}
                        </span>
                      </span>
                      {entry.hint ? (
                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.hint}
                        </span>
                      ) : null}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {customVisible ? (
              <CommandGroup heading="Bring your own endpoint">
                <CommandItem
                  value="custom openai-compatible"
                  onSelect={() => handleSelect(`custom:${customCreds?.customModel || "openai"}`)}
                  className="gap-2"
                >
                  <Check
                    className={cn(
                      "size-4",
                      byok.activeModelId?.startsWith("custom:") ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">Custom (OpenAI-compatible)</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Ollama · LM Studio · vLLM
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
