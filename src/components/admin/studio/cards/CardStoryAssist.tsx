'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { extractMediaFromContent } from '@/lib/utils/cardUtils';
import styles from './CardForm.module.css';

type CardDraftOption = { title: string; subtitle: string; excerpt: string; content: string; rationale?: string };
type StoryAssistGuide = 'bob' | 'sandra';
type StoryAssistMode = 'draftFromNotes' | 'tightenWording' | 'expandMemory' | 'retitleStory' | 'makeStoryStronger';
type StoryCoachSuggestion = { category: string; suggestion: string; prompt?: string; example?: string };

const STORAGE_KEY = 'myjournal-ai-story-guide';
const GUIDE_LABEL: Record<StoryAssistGuide, string> = { bob: 'Bob', sandra: 'Sandra' };
const GUIDE_HINT: Record<StoryAssistGuide, string> = {
  bob: 'Direct, grounded, and plainspoken.',
  sandra: 'Warm, reflective, and conversational.',
};
const WRITE_MODES: StoryAssistMode[] = ['draftFromNotes', 'tightenWording', 'expandMemory', 'retitleStory'];
const MODE_LABEL: Record<StoryAssistMode, string> = {
  draftFromNotes: 'Draft from notes', tightenWording: 'Tighten wording', expandMemory: 'Expand this memory',
  retitleStory: 'Retitle this story', makeStoryStronger: 'Make this story stronger',
};
const MODE_HINT: Record<StoryAssistMode, string> = {
  draftFromNotes: 'Turn rough notes into a readable story draft.',
  tightenWording: 'Clean up flow, repetition, and clarity.',
  expandMemory: 'Draw out meaning and scene without inventing facts.',
  retitleStory: 'Improve the title and subtitle while keeping the story aligned.',
  makeStoryStronger: 'Return coaching suggestions that deepen the story.',
};

function textToBasicHtml(text: string): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safe.split(/\n{2,}/).map((block) => `<p>${block.replace(/\n/g, '<br/>')}</p>`).join('');
}

export default function CardStoryAssist({
  title, subtitle, excerpt, content, isSaving, getCurrentContent, setField, updateContentMedia,
}: {
  title: string; subtitle: string; excerpt: string; content: string; isSaving: boolean;
  getCurrentContent: () => string;
  setField: (field: 'title' | 'subtitle' | 'excerpt' | 'excerptAuto' | 'content', value: string | boolean) => void;
  updateContentMedia: (ids: string[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [includeHistoricalContext, setIncludeHistoricalContext] = useState(false);
  const [guide, setGuide] = useState<StoryAssistGuide>('bob');
  const [activeMode, setActiveMode] = useState<StoryAssistMode | null>(null);
  const [summary, setSummary] = useState('');
  const [options, setOptions] = useState<CardDraftOption[]>([]);
  const [coaching, setCoaching] = useState<StoryCoachSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'bob' || stored === 'sandra') setGuide(stored);
  }, []);
  useEffect(() => {
    if (loading || options.length || coaching.length || error || summary) setOpen(true);
  }, [coaching.length, error, loading, options.length, summary]);

  const changeGuide = useCallback((next: StoryAssistGuide) => {
    setGuide(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);
  const clear = useCallback(() => {
    setActiveMode(null); setSummary(''); setOptions([]); setCoaching([]); setError(null);
  }, []);
  const request = useCallback(async (mode: StoryAssistMode) => {
    setLoading(true); setActiveMode(mode); setError(null); setSummary(''); setOptions([]); setCoaching([]);
    try {
      const response = await fetch('/api/ai/suggest-card-drafts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ title, subtitle, excerpt, content: getCurrentContent() || content, includeHistoricalContext, guide, mode }),
      });
      const payload = await response.json().catch(() => ({})) as {
        message?: string; error?: string; summary?: string; options?: CardDraftOption[]; coaching?: StoryCoachSuggestion[];
      };
      if (!response.ok) throw new Error(payload.error || payload.message || `Request failed (${response.status})`);
      setSummary(typeof payload.summary === 'string' ? payload.summary : '');
      if (mode === 'makeStoryStronger') {
        if (!payload.coaching?.length) throw new Error('No coaching suggestions returned.');
        setCoaching(payload.coaching);
      } else {
        if (!payload.options?.length) throw new Error('No draft options returned.');
        setOptions(payload.options.slice(0, 1));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to get suggestions');
    } finally { setLoading(false); }
  }, [content, excerpt, getCurrentContent, guide, includeHistoricalContext, subtitle, title]);

  const apply = useCallback((option: CardDraftOption) => {
    setField('title', option.title || ''); setField('subtitle', option.subtitle || '');
    setField('excerptAuto', false); setField('excerpt', option.excerpt || '');
    const html = textToBasicHtml(option.content || '');
    setField('content', html); updateContentMedia(extractMediaFromContent(html)); clear();
  }, [clear, setField, updateContentMedia]);

  return <div className={styles.aiAssistSection}>
    <div className={styles.aiAssistSectionHeader}>
      <h4 className={styles.sectionTitle}>Story Assist</h4>
      <button type="button" className={styles.aiAssistCollapseButton} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="story-assist-panel">
        {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
      </button>
    </div>
    {open ? <div id="story-assist-panel">
      <div className={styles.aiAssistHeaderBlock}>
        <div className={styles.aiAssistGuideGroup} role="radiogroup" aria-label="Story guide">
          {(['bob', 'sandra'] as StoryAssistGuide[]).map((item) => <button key={item} type="button" className={`${styles.aiAssistGuideButton} ${guide === item ? styles.aiAssistGuideButtonActive : ''}`} aria-pressed={guide === item} onClick={() => changeGuide(item)} disabled={loading}>{GUIDE_LABEL[item]}</button>)}
        </div>
        <p className={styles.aiAssistGuideHint}>{GUIDE_HINT[guide]}</p>
      </div>
      <div className={styles.aiAssistTopRow}>
        <div className={styles.aiAssistActionGroup}>
          {[...WRITE_MODES, 'makeStoryStronger' as const].map((mode) => <button key={mode} type="button" className={styles.aiAssistButton} onClick={() => void request(mode)} disabled={loading || isSaving} title={MODE_HINT[mode]}>{loading && activeMode === mode ? 'Working...' : MODE_LABEL[mode]}</button>)}
          <button type="button" className={styles.aiAssistClearButton} onClick={clear} disabled={loading || (!options.length && !coaching.length && !error && !summary)}>Clear</button>
        </div>
        <label className={styles.aiAssistToggle}><input type="checkbox" checked={includeHistoricalContext} onChange={(event) => setIncludeHistoricalContext(event.target.checked)} disabled={loading} />Include historical context</label>
      </div>
      {error ? <p className={styles.aiAssistError}>{error}</p> : null}
      {summary && !error ? <p className={styles.aiAssistSummary}>{summary}</p> : null}
      {coaching.length > 0 && activeMode === 'makeStoryStronger' ? <div className={styles.aiAssistCoachList}>{coaching.map((item, index) => <article key={`${item.category}-${index}`} className={styles.aiAssistCoachCard}><p className={styles.aiAssistCoachCategory}>{item.category}</p><p className={styles.aiAssistCoachSuggestion}>{item.suggestion}</p>{item.prompt ? <p className={styles.aiAssistCoachPrompt}>Prompt: {item.prompt}</p> : null}{item.example ? <p className={styles.aiAssistCoachExample}>Example: {item.example}</p> : null}</article>)}</div> : null}
      {options.length ? <div className={styles.aiAssistSuggestions}>{options.map((option, index) => <button key={`${option.title || 'draft'}-${index}`} type="button" className={styles.aiAssistSuggestionButton} onClick={() => apply(option)}><span className={styles.aiAssistSuggestionTitle}>{option.title || `Suggestion ${index + 1}`}</span>{option.rationale ? <span className={styles.aiAssistSuggestionHint}>{option.rationale}</span> : null}</button>)}</div> : null}
    </div> : null}
  </div>;
}
