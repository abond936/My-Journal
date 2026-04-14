import { z } from 'zod';

export const suggestCardDraftsRequestSchema = z.object({
  title: z.string().max(300).optional().default(''),
  subtitle: z.string().max(500).optional().default(''),
  excerpt: z.string().max(3000).optional().default(''),
  content: z.string().max(50000).optional().default(''),
  includeHistoricalContext: z.boolean().optional().default(false),
});

export const cardDraftOptionSchema = z.object({
  title: z.string().max(300),
  subtitle: z.string().max(500),
  excerpt: z.string().max(3000),
  content: z.string().max(50000),
  rationale: z.string().max(600).optional().default(''),
});

export const suggestCardDraftsResponseSchema = z.object({
  options: z.array(cardDraftOptionSchema).min(2).max(2),
});

export type SuggestCardDraftsRequest = z.infer<typeof suggestCardDraftsRequestSchema>;
export type CardDraftOption = z.infer<typeof cardDraftOptionSchema>;
export type SuggestCardDraftsResponse = z.infer<typeof suggestCardDraftsResponseSchema>;

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

function normalizeDraftPayload(raw: unknown): unknown {
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

  if (!raw || typeof raw !== 'object') return raw;
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
  if (single) return { options: [single] };

  return raw;
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

export async function suggestCardDraftOptions(input: SuggestCardDraftsRequest): Promise<SuggestCardDraftsResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI is not configured. Set GOOGLE_AI_API_KEY in environment.');
  }

  const textContent = truncateText(stripHtml(input.content || ''), 8000);
  const title = truncateText(input.title || '', 250);
  const subtitle = truncateText(input.subtitle || '', 400);
  const excerpt = truncateText(input.excerpt || '', 1600);
  const prompt = [
    'Help improve a personal family-journal card.',
    'Return exactly 2 distinct draft options as JSON with shape: { "options": [{ "title","subtitle","excerpt","content","rationale" }] }.',
    'Constraints:',
    '- Do not invent facts, names, dates, or places.',
    '- Keep unknown details neutral.',
    '- Keep title clear and short.',
    '- Keep excerpt concise (1-3 sentences).',
    '- Keep content coherent and readable, 1-3 short paragraphs.',
    '- Rationale is one short sentence.',
    input.includeHistoricalContext
      ? '- You may include brief historical context only when relevant and clearly framed as context, not certainty.'
      : '- Do not add historical background context.',
    '',
    `Current title: ${title || '(empty)'}`,
    `Current subtitle: ${subtitle || '(empty)'}`,
    `Current excerpt: ${excerpt || '(empty)'}`,
    `Current content (plain text): ${textContent || '(empty)'}`,
  ].join('\n');

  const primaryModel = process.env.GOOGLE_AI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = process.env.GOOGLE_AI_FALLBACK_MODEL || 'gemini-2.0-flash';

  const makeRequestBody = (strictJsonHint = false) => ({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${prompt}\n\nOutput valid JSON only.${strictJsonHint ? ' Do not include markdown code fences or commentary.' : ''}` }],
      },
    ],
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 2048,
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
    // One strict retry for parse failures (non-busy, non-auth)
    const retryText = await invokeModel(primaryModel, 0, true);
    try {
      parsedJson = extractJsonCandidate(retryText);
    } catch {
      console.warn(`[AI draft assist] JSON parse failure (${primaryModel}): ${safeSnippet(retryText)}`);
      throw new Error('AI returned invalid JSON.');
    }
  }

  parsedJson = normalizeDraftPayload(parsedJson);

  const validated = suggestCardDraftsResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.warn(`[AI draft assist] schema validation failure (${primaryModel}): ${safeSnippet(content)}`);
    throw new Error('AI output did not match expected draft schema.');
  }
  return validated.data;
}

