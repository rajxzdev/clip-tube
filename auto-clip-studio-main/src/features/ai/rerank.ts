/**
 * Optional AI highlight reranker.
 *
 * Given a wider pool of heuristic candidates (with their transcript excerpts),
 * asks the active model to order them by "clip virality" and returns the top-N.
 * Any failure falls back to the original heuristic order so the pipeline never
 * breaks because of AI.
 */
import type { Highlight, SubtitleCue } from "../autoclip/types";
import { sliceCues } from "../autoclip/subtitles";
import { chat, extractJson, type ChatOptions } from "./client";

export interface RerankResult {
  highlights: Highlight[];
  /** The model actually performed the rerank (false = fell back). */
  reranked: boolean;
  note?: string;
}

/**
 * @param pool   diverse candidate highlights (>= clipCount).
 * @param cues   full transcript for the source.
 * @param clipCount how many to keep.
 */
export async function aiRerankHighlights(
  pool: Highlight[],
  cues: SubtitleCue[],
  clipCount: number,
  signal?: AbortSignal,
): Promise<RerankResult> {
  if (pool.length === 0) {
    return { highlights: [], reranked: false };
  }

  const annotated = pool.slice(0, Math.min(pool.length, 16)).map((highlight, index) => {
    const excerpt = sliceCues(cues, highlight.start, highlight.end)
      .map((cue) => cue.text)
      .join(" ")
      .trim()
      .slice(0, 600);
    return { index, start: highlight.start, end: highlight.end, excerpt };
  });

  const system =
    "You are a short-form video editor who knows what makes clips go viral on TikTok, Reels and Shorts. " +
    "You rank candidate moments by hook strength, emotional payoff, clarity and shareability. " +
    "Respond ONLY with compact JSON, no prose.";

  const user =
    `Below are ${annotated.length} candidate clips from one source video, each with its ` +
    `transcript excerpt. Rank them from BEST to WORST for going viral as a short clip.\n\n` +
    annotated
      .map(
        (item) =>
          `#${item.index} [${formatTime(item.start)}–${formatTime(item.end)}]\n${item.excerpt || "(no transcript in range)"}`,
      )
      .join("\n\n") +
    `\n\nReturn JSON in this exact shape: {"ranking":[<index>, ...]} listing the candidate indices ` +
    `best-first, all of them, no explanation.`;

  try {
    const chatOpts: ChatOptions = { temperature: 0.2, maxTokens: 512, json: true };
    if (signal) chatOpts.signal = signal;
    const reply = await chat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      chatOpts,
    );
    const parsed = extractJson<{ ranking?: number[] }>(reply);
    const ranking = Array.isArray(parsed.ranking) ? parsed.ranking : [];
    if (ranking.length === 0) {
      return {
        highlights: pool.slice(0, clipCount),
        reranked: false,
        note: "Model returned no ranking",
      };
    }

    const byIndex = new Map(pool.map((highlight, index) => [index, highlight]));
    const ordered: Highlight[] = [];
    const seen = new Set<number>();
    for (const raw of ranking) {
      if (typeof raw !== "number") continue;
      if (raw < 0 || raw >= pool.length || seen.has(raw)) continue;
      const highlight = byIndex.get(raw);
      if (!highlight) continue;
      ordered.push(highlight);
      seen.add(raw);
    }
    // Append any candidates the model skipped, preserving heuristic order.
    for (let index = 0; index < pool.length; index += 1) {
      if (!seen.has(index)) {
        const highlight = byIndex.get(index);
        if (highlight) ordered.push(highlight);
      }
    }

    const sliced = ordered.slice(0, Math.max(1, clipCount)).sort((a, b) => a.start - b.start);
    return { highlights: sliced, reranked: true };
  } catch (error) {
    return {
      highlights: pool.slice(0, clipCount),
      reranked: false,
      note: error instanceof Error ? error.message : "AI rerank failed",
    };
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}
