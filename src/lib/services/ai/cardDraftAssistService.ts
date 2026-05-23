import { z } from 'zod';

export const storyAssistWriteModes = [
  'draftFromNotes',
  'tightenWording',
  'expandMemory',
  'retitleStory',
] as const;
export const storyAssistCoachModes = ['makeStoryStronger'] as const;
export const storyAssistModes = [
  ...storyAssistWriteModes,
  ...storyAssistCoachModes,
] as const;

export const storyAssistModeSchema = z.enum(storyAssistModes);

export const suggestCardDraftsRequestSchema = z.object({
  title: z.string().max(300).optional().default(''),
  subtitle: z.string().max(500).optional().default(''),
  excerpt: z.string().max(3000).optional().default(''),
  content: z.string().max(50000).optional().default(''),
  includeHistoricalContext: z.boolean().optional().default(false),
  guide: z.enum(['bob', 'sandra']).optional().default('bob'),
  mode: storyAssistModeSchema.optional().default('draftFromNotes'),
});

export const cardDraftOptionSchema = z.object({
  title: z.string().max(300),
  subtitle: z.string().max(500),
  excerpt: z.string().max(3000),
  content: z.string().max(50000),
  rationale: z.string().max(600).optional().default(''),
});

export const storyCoachSuggestionSchema = z.object({
  category: z.string().max(80),
  suggestion: z.string().max(600),
  prompt: z.string().max(280).optional().default(''),
  example: z.string().max(400).optional().default(''),
});

const storyAssistWriteResponseSchema = z.object({
  mode: z.enum(storyAssistWriteModes),
  summary: z.string().max(400).optional().default(''),
  options: z.array(cardDraftOptionSchema).min(1).max(1),
  coaching: z.array(storyCoachSuggestionSchema).optional().default([]),
});

const storyAssistCoachResponseSchema = z.object({
  mode: z.enum(storyAssistCoachModes),
  summary: z.string().max(400).optional().default(''),
  options: z.array(cardDraftOptionSchema).optional().default([]),
  coaching: z.array(storyCoachSuggestionSchema).min(3).max(6),
});

export const suggestCardDraftsResponseSchema = z.discriminatedUnion('mode', [
  storyAssistWriteResponseSchema,
  storyAssistCoachResponseSchema,
]);

export type SuggestCardDraftsRequest = z.infer<typeof suggestCardDraftsRequestSchema>;
export type CardDraftOption = z.infer<typeof cardDraftOptionSchema>;
export type StoryCoachSuggestion = z.infer<typeof storyCoachSuggestionSchema>;
export type StoryAssistMode = z.infer<typeof storyAssistModeSchema>;
export type SuggestCardDraftsResponse = z.infer<typeof suggestCardDraftsResponseSchema>;
type StoryAssistGuide = NonNullable<SuggestCardDraftsRequest['guide']>;

const BUSY_MODEL_MESSAGE = 'Models busy, please retry in 15 seconds.';

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonCandidate(text: string): unknown {
  const direct = tryParseJson(text);
  if (direct !== null) return direct;

  const fenced = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fromFence = tryParseJson(fenced[1].trim());
    if (fromFence !== null) return fromFence;
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = text.slice(firstBrace, lastBrace + 1);
    const fromSlice = tryParseJson(sliced);
    if (fromSlice !== null) return fromSlice;
  }

  throw new Error('AI returned invalid JSON.');
}

function normalizeDraftPayload(raw: unknown): Record<string, unknown> {
  const normalizeOption = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') return null;
    const o = value as Record<string, unknown>;
    return {
      title: String(o.title ?? o.headline ?? ''),
      subtitle: String(o.subtitle ?? o.subheading ?? ''),
      excerpt: String(o.excerpt ?? o.summary ?? ''),
      content: String(o.content ?? o.body ?? ''),
      rationale: String(o.rationale ?? o.reason ?? ''),
    };
  };

  if (Array.isArray(raw)) {
    const options = raw
      .map(normalizeOption)
      .filter((v): v is Record<string, unknown> => Boolean(v));
    return { options };
  }

  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;

  let sourceOptions: unknown = obj.options;
  if (!sourceOptions) sourceOptions = obj.option;
  if (!sourceOptions) sourceOptions = obj.drafts;
  if (!sourceOptions) sourceOptions = obj.variants;

  if (Array.isArray(sourceOptions)) {
    const options = sourceOptions
      .map(normalizeOption)
      .filter((v): v is Record<string, unknown> => Boolean(v));
    return { ...obj, options };
  }

  if (sourceOptions && typeof sourceOptions === 'object') {
    const values = Object.values(sourceOptions as Record<string, unknown>);
    const options = values
      .map(normalizeOption)
      .filter((v): v is Record<string, unknown> => Boolean(v));
    if (options.length > 0) return { ...obj, options };
  }

  const single = normalizeOption(obj);
  if (single) return { ...obj, options: [single] };

  return obj;
}

function normalizeCoachPayload(raw: unknown): Record<string, unknown> {
  const normalizeSuggestion = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== 'object') return null;
    const item = value as Record<string, unknown>;
    const suggestion = String(
      item.suggestion ?? item.observation ?? item.advice ?? item.note ?? ''
    ).trim();
    if (!suggestion) return null;

    return {
      category: String(item.category ?? item.focus ?? item.area ?? 'Suggestion').trim(),
      suggestion,
      prompt: String(item.prompt ?? item.followUp ?? item.question ?? '').trim(),
      example: String(item.example ?? item.exampleLine ?? item.sample ?? '').trim(),
    };
  };

  if (Array.isArray(raw)) {
    return {
      coaching: raw
        .map(normalizeSuggestion)
        .filter((value): value is Record<string, unknown> => Boolean(value)),
    };
  }

  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const source =
    obj.coaching ??
    obj.suggestions ??
    obj.observations ??
    obj.feedback ??
    obj.items ??
    obj.notes;

  let coaching: Record<string, unknown>[] = [];
  if (Array.isArray(source)) {
    coaching = source
      .map(normalizeSuggestion)
      .filter((value): value is Record<string, unknown> => Boolean(value));
  } else if (source && typeof source === 'object') {
    coaching = Object.values(source as Record<string, unknown>)
      .map(normalizeSuggestion)
      .filter((value): value is Record<string, unknown> => Boolean(value));
  }

  return {
    ...obj,
    coaching,
    summary: String(obj.summary ?? obj.overview ?? obj.rationale ?? obj.message ?? '').trim(),
  };
}

function normalizeStoryAssistPayload(
  raw: unknown,
  mode: StoryAssistMode
): Record<string, unknown> {
  if (mode === 'makeStoryStronger') {
    return {
      mode,
      ...normalizeCoachPayload(raw),
    };
  }

  const draftPayload = normalizeDraftPayload(raw);
  return {
    mode,
    summary:
      typeof draftPayload.summary === 'string'
        ? draftPayload.summary
        : typeof draftPayload.rationale === 'string'
          ? draftPayload.rationale
          : '',
    ...draftPayload,
  };
}

function safeSnippet(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > 280 ? `${oneLine.slice(0, 280)}...` : oneLine;
}

function collectCandidateText(payload: {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p.text)
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .join('\n');
}

function buildPrompt(input: SuggestCardDraftsRequest, textContent: string): string {
  const guidePromptById: Record<StoryAssistGuide, string> = {
    bob: 'Guide voice: Bob. Keep the tone steady, direct, grounded, and plainspoken. Favor clarity over flourish.',
    sandra:
      'Guide voice: Sandra. Keep the tone warm, reflective, encouraging, and conversational while still staying concise.',
  };

  const title = truncateText(input.title || '', 250);
  const subtitle = truncateText(input.subtitle || '', 400);
  const excerpt = truncateText(input.excerpt || '', 1600);
  const historicalContextLine = input.includeHistoricalContext
    ? '- You may include brief historical context only when relevant and clearly framed as context, not certainty.'
    : '- Do not add historical background context.';

  const modePrompts: Record<StoryAssistMode, string[]> = {
    draftFromNotes: [
      'Help improve a personal family-journal card.',
      'Task: Draft from notes. Turn rough notes into a coherent, readable story while staying faithful to the source material.',
      'Return valid JSON only with shape: { "mode":"draftFromNotes", "summary":"", "options":[{ "title","subtitle","excerpt","content","rationale" }] }.',
      'Constraints:',
      '- Do not invent facts, names, dates, or places.',
      '- Keep unknown details neutral.',
      '- Keep title clear and short.',
      '- Keep excerpt concise (1-3 sentences).',
      '- Keep content coherent and readable, 1-3 short paragraphs.',
      '- Rationale is one short sentence.',
    ],
    tightenWording: [
      'Help improve a personal family-journal card.',
      'Task: Tighten wording. Preserve the existing meaning but make the writing cleaner, sharper, and easier to read.',
      'Return valid JSON only with shape: { "mode":"tightenWording", "summary":"", "options":[{ "title","subtitle","excerpt","content","rationale" }] }.',
      'Constraints:',
      '- Do not invent facts, names, dates, or places.',
      '- Keep the same overall meaning and point of view.',
      '- Prefer clearer phrasing, better flow, and less repetition.',
      '- Keep excerpt concise (1-3 sentences).',
      '- Keep content coherent and readable, 1-3 short paragraphs.',
      '- Rationale is one short sentence.',
    ],
    expandMemory: [
      'Help improve a personal family-journal card.',
      'Task: Expand this memory. Gently enrich the story with reflection, transitions, and scene-setting without inventing facts.',
      'Return valid JSON only with shape: { "mode":"expandMemory", "summary":"", "options":[{ "title","subtitle","excerpt","content","rationale" }] }.',
      'Constraints:',
      '- Do not invent facts, names, dates, or places.',
      '- Expand only by drawing out likely meaning, memory, and flow already implied by the draft.',
      '- Keep any unknown details neutral rather than specific.',
      '- Keep excerpt concise (1-3 sentences).',
      '- Keep content coherent and readable, 2-4 short paragraphs.',
      '- Rationale is one short sentence.',
    ],
    retitleStory: [
      'Help improve a personal family-journal card.',
      'Task: Retitle this story. Prioritize a stronger, clearer title and subtitle while lightly aligning the excerpt and content if needed.',
      'Return valid JSON only with shape: { "mode":"retitleStory", "summary":"", "options":[{ "title","subtitle","excerpt","content","rationale" }] }.',
      'Constraints:',
      '- Do not invent facts, names, dates, or places.',
      '- The title should be memorable and clear.',
      '- The subtitle should orient the reader without sounding promotional.',
      '- Only make light supporting adjustments to excerpt/content.',
      '- Rationale is one short sentence.',
    ],
    makeStoryStronger: [
      'Help improve a personal family-journal card.',
      'Task: Make this story stronger. Provide coaching suggestions that deepen the story without rewriting it for the author.',
      'Return valid JSON only with shape: { "mode":"makeStoryStronger", "summary":"", "coaching":[{ "category","suggestion","prompt","example" }] }.',
      'Constraints:',
      '- Do not invent facts, names, dates, or places.',
      '- Do not rewrite the full story.',
      '- Focus on what would make the story clearer, more vivid, more meaningful, and easier for readers to follow.',
      '- Look for missing who/what/when/where context, reflections, emotions, sensory details, scene-setting, or stronger closing meaning.',
      '- Each coaching item should be distinct and useful.',
      '- Prompt should be a short follow-up question the author could answer.',
      '- Example should be optional and, when present, be a short sample line rather than a full rewrite.',
    ],
  };

  return [
    ...modePrompts[input.mode],
    guidePromptById[input.guide ?? 'bob'],
    historicalContextLine,
    '',
    `Current title: ${title || '(empty)'}`,
    `Current subtitle: ${subtitle || '(empty)'}`,
    `Current excerpt: ${excerpt || '(empty)'}`,
    `Current content (plain text): ${textContent || '(empty)'}`,
  ].join('\n');
}

export async function suggestCardDraftOptions(
  input: SuggestCardDraftsRequest
): Promise<SuggestCardDraftsResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI is not configured. Set GOOGLE_AI_API_KEY in environment.');
  }

  const textContent = truncateText(stripHtml(input.content || ''), 8000);
  const prompt = buildPrompt(input, textContent);
  const primaryModel = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = process.env.GOOGLE_AI_FALLBACK_MODEL || 'gemini-2.0-flash';

  const makeRequestBody = (strictJsonHint = false) => ({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${prompt}\n\nOutput valid JSON only.${strictJsonHint ? ' Do not include markdown code fences or commentary.' : ''}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: input.mode === 'makeStoryStronger' ? 0.6 : 0.65,
      maxOutputTokens: input.mode === 'makeStoryStronger' ? 2200 : 2048,
      responseMimeType: 'application/json',
    },
  });

  const invokeModel = async (model: string, maxRetries: number, strictJsonHint = false): Promise<string> => {
    const requestBody = makeRequestBody(strictJsonHint);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        if (attempt < maxRetries) {
          const waitMs = 500 * (attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }
        throw new Error(BUSY_MODEL_MESSAGE);
      }

      if (res.ok) {
        const payload = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };
        const text = collectCandidateText(payload);
        if (!text) {
          throw new Error('AI response did not include content.');
        }
        return text;
      }

      const bodyText = await res.text();
      const isBusy = res.status === 429 || res.status === 503;
      if (isBusy && attempt < maxRetries) {
        const waitMs = 500 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      if (isBusy) {
        throw new Error(BUSY_MODEL_MESSAGE);
      }
      throw new Error(`AI request failed (${res.status}): ${bodyText.slice(0, 300)}`);
    }
    throw new Error(BUSY_MODEL_MESSAGE);
  };

  let content: string;
  try {
    content = await invokeModel(primaryModel, 2);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === BUSY_MODEL_MESSAGE &&
      fallbackModel &&
      fallbackModel !== primaryModel
    ) {
      content = await invokeModel(fallbackModel, 2);
    } else {
      throw error;
    }
  }

  if (!content) {
    throw new Error('AI response did not include content.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = extractJsonCandidate(content);
  } catch {
    const retryText = await invokeModel(primaryModel, 0, true);
    try {
      parsedJson = extractJsonCandidate(retryText);
    } catch {
      console.warn(`[AI draft assist] JSON parse failure (${primaryModel}): ${safeSnippet(retryText)}`);
      throw new Error('AI returned invalid JSON.');
    }
  }

  parsedJson = normalizeStoryAssistPayload(parsedJson, input.mode);

  const validated = suggestCardDraftsResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.warn(`[AI draft assist] schema validation failure (${primaryModel}): ${safeSnippet(content)}`);
    throw new Error('AI output did not match expected story assist schema.');
  }
  return validated.data;
}
