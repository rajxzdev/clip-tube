/**
 * AI-generated clip packaging: a punchy title, a caption and hashtags built from
 * the clip's transcript. Returns structured data; never throws on AI failure.
 */
import { chat, extractJson, type ChatOptions } from "./client";
import { resolveActive } from "./byok";

export interface ClipMeta {
  title: string;
  caption: string;
  hashtags: string[];
  model: string;
}

export async function aiGenerateClipMeta(
  transcript: string,
  context: { sourceTitle?: string; start?: number; end?: number },
  signal?: AbortSignal,
): Promise<ClipMeta> {
  const titleHint = context.sourceTitle ? ` (source: "${context.sourceTitle.slice(0, 80)}")` : "";
  const system =
    "You write social copy for short-form video. You are concise, high-energy and on-trend. " +
    "Respond ONLY with compact JSON, no prose, no markdown.";

  const user =
    `Write packaging for one short clip${titleHint}.\n\n` +
    `Transcript of the clip:\n"""${transcript.slice(0, 1500) || "(no transcript available)"}"""\n\n` +
    `Return JSON in this exact shape:\n` +
    `{"title": string (<=70 chars, scroll-stopping), "caption": string (<=280 chars, hook + context + CTA), ` +
    `"hashtags": string[] (5-8 relevant tags without the # symbol)}.`;

  const chatOpts: ChatOptions = { temperature: 0.8, maxTokens: 700, json: true };
  if (signal) chatOpts.signal = signal;
  const reply = await chat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    chatOpts,
  );

  const parsed = extractJson<{ title?: string; caption?: string; hashtags?: unknown }>(reply);
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.replace(/^#+/, "").trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const active = resolveActive();
  return {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "",
    caption:
      typeof parsed.caption === "string" && parsed.caption.trim() ? parsed.caption.trim() : "",
    hashtags,
    model: active?.modelId ?? "ai",
  };
}
