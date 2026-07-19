import {
  CURRENT_READER_THEME_COMPONENTS,
  DEFAULT_READER_THEME_RECIPES,
  type ReaderThemeComponentBinding,
} from '@/lib/theme/readerThemeSystem';
import type { ReaderThemeRecipes } from '@/lib/types/theme';

export type ThemeControlLayer = 'foundation' | 'shared-system' | 'component' | 'layout' | 'guardrail';
export type ThemeControlStatus = 'governed' | 'partial' | 'missing' | 'fixed-guardrail';

export interface ThemeMacroControlInventoryItem {
  id: string;
  label: string;
  layer: ThemeControlLayer;
  status: ThemeControlStatus;
  currentPath: string;
  requiredOutcome: string;
}

export type ThemeTypographyOwnershipLayer = 'foundation' | 'shared-system' | 'component' | 'guardrail';
export type ThemeTypographyOwnershipStatus = 'source-needed' | 'defined' | 'needs-inheritance' | 'parked' | 'fixed-guardrail';

export interface ThemeTypographyOwnershipItem {
  id: string;
  label: string;
  layer: ThemeTypographyOwnershipLayer;
  status: ThemeTypographyOwnershipStatus;
  currentRoles: Array<keyof ReaderThemeRecipes['typography']>;
  inheritsFrom?: string;
  legitimateVariants: string[];
  decision: string;
}

/**
 * Typography ownership is intentionally based on product jobs rather than
 * coincidentally identical default values. Component roles remain available as
 * override slots, but should inherit until an author makes a deliberate local
 * choice.
 */
export const THEME_TYPOGRAPHY_OWNERSHIP: ThemeTypographyOwnershipItem[] = [
  {
    id: 'foundation-families',
    label: 'Foundation font families',
    layer: 'foundation',
    status: 'defined',
    currentRoles: [],
    legitimateVariants: ['package', 'scope'],
    decision: 'Centralized UI, reading, and display family sources govern inherited roles. Mode does not independently change font family.',
  },
  {
    id: 'content-title',
    label: 'Content title',
    layer: 'shared-system',
    status: 'defined',
    currentRoles: ['title'],
    inheritsFrom: 'foundation-families/display',
    legitimateVariants: ['compact', 'detail', 'overlay'],
    decision: 'Own the default content-title hierarchy; card types do not receive distinct defaults merely because their type differs.',
  },
  {
    id: 'content-title-contexts',
    label: 'Content title contexts',
    layer: 'shared-system',
    status: 'needs-inheritance',
    currentRoles: ['titleCompact', 'detailTitle', 'discoveryTitle', 'railSectionTitle', 'railCardTitle'],
    inheritsFrom: 'content-title',
    legitimateVariants: ['compact', 'detail', 'discovery-section', 'discovery-card'],
    decision: 'Keep context-specific geometry and hierarchy while inheriting unchanged title attributes.',
  },
  {
    id: 'content-prose',
    label: 'Content prose and metadata',
    layer: 'shared-system',
    status: 'defined',
    currentRoles: ['subtitle', 'body', 'excerpt', 'meta', 'caption'],
    inheritsFrom: 'foundation-families/reading',
    legitimateVariants: ['semantic-job'],
    decision: 'These roles express distinct publishing jobs and should remain shared semantic recipes.',
  },
  {
    id: 'application-ui',
    label: 'Application UI typography',
    layer: 'shared-system',
    status: 'needs-inheritance',
    currentRoles: ['chromeText', 'chromeMeta', 'supportTitle', 'supportLabel', 'supportMeta', 'supportHint', 'supportControlText'],
    inheritsFrom: 'foundation-families/ui',
    legitimateVariants: ['title', 'label', 'meta', 'hint', 'control'],
    decision: 'UI roles inherit one application family while retaining semantic size, weight, line-height, and color jobs.',
  },
  {
    id: 'feedback-ui',
    label: 'Feedback typography',
    layer: 'shared-system',
    status: 'needs-inheritance',
    currentRoles: ['feedbackTitle', 'feedbackMeta', 'feedbackHint'],
    inheritsFrom: 'application-ui',
    legitimateVariants: ['title', 'meta', 'hint'],
    decision: 'Feedback inherits the shared UI hierarchy unless readability or state meaning requires an explicit override.',
  },
  {
    id: 'discovery-meta',
    label: 'Discovery metadata',
    layer: 'shared-system',
    status: 'needs-inheritance',
    currentRoles: ['discoveryMeta'],
    inheritsFrom: 'content-prose/meta',
    legitimateVariants: ['discovery'],
    decision: 'Discovery may override density while inheriting the shared metadata family and color meaning.',
  },
  {
    id: 'story-overrides',
    label: 'Story typography overrides',
    layer: 'component',
    status: 'needs-inheritance',
    currentRoles: ['storyTitle', 'storyOverlayTitle', 'storyExcerpt', 'storyDetailTitle'],
    inheritsFrom: 'content-title and content-prose',
    legitimateVariants: ['closed', 'overlay', 'detail'],
    decision: 'Preserve Story override slots, but default them to shared title and prose jobs.',
  },
  {
    id: 'gallery-overrides',
    label: 'Gallery typography overrides',
    layer: 'component',
    status: 'needs-inheritance',
    currentRoles: ['galleryTitle', 'galleryOverlayTitle', 'galleryHeaderTitle', 'galleryDetailTitle'],
    inheritsFrom: 'content-title',
    legitimateVariants: ['closed', 'overlay', 'header', 'detail'],
    decision: 'Preserve Gallery override slots, but default them to shared title jobs.',
  },
  {
    id: 'question-treatment',
    label: 'Question prompt treatment',
    layer: 'component',
    status: 'defined',
    currentRoles: ['question', 'questionOverlay'],
    inheritsFrom: 'foundation-families/display',
    legitimateVariants: ['uncovered', 'covered-overlay'],
    decision: 'Question prompts have distinct product meaning; container-relative fitting remains a guardrail rather than a theme variant.',
  },
  {
    id: 'callout-treatment',
    label: 'Callout treatment',
    layer: 'component',
    status: 'defined',
    currentRoles: ['calloutTitle', 'calloutBody'],
    inheritsFrom: 'content-title and content-prose/body',
    legitimateVariants: ['title', 'body'],
    decision: 'Callout emphasis is a meaningful component treatment and may deliberately override shared content roles.',
  },
  {
    id: 'tag-label',
    label: 'Tag label',
    layer: 'shared-system',
    status: 'defined',
    currentRoles: ['tagLabel'],
    inheritsFrom: 'foundation-families/ui',
    legitimateVariants: ['contrast-context'],
    decision: 'All dimensional tags share one label recipe; dimension color does not imply separate typography.',
  },
  {
    id: 'quote-treatment',
    label: 'Quote treatment',
    layer: 'component',
    status: 'parked',
    currentRoles: ['quote'],
    inheritsFrom: 'foundation-families/reading',
    legitimateVariants: ['future-definition'],
    decision: 'Retain the existing role without expanding it while Quote remains parked by author decision.',
  },
  {
    id: 'responsive-fitting',
    label: 'Responsive typography fitting',
    layer: 'guardrail',
    status: 'fixed-guardrail',
    currentRoles: [],
    legitimateVariants: ['container-size', 'content-length', 'accessibility'],
    decision: 'Components own clamping, overflow prevention, minimum readable sizes, and responsive fitting.',
  },
];

export function auditTypographyOwnership(
  recipes: ReaderThemeRecipes = DEFAULT_READER_THEME_RECIPES
) {
  const recipeRoles = Object.keys(recipes.typography) as Array<keyof ReaderThemeRecipes['typography']>;
  const assignments = THEME_TYPOGRAPHY_OWNERSHIP.flatMap((item) =>
    item.currentRoles.map((role) => ({ role, ownerId: item.id }))
  );
  const assignmentCounts = assignments.reduce<Partial<Record<keyof ReaderThemeRecipes['typography'], number>>>((counts, assignment) => {
    counts[assignment.role] = (counts[assignment.role] ?? 0) + 1;
    return counts;
  }, {});

  return {
    recipeRoleCount: recipeRoles.length,
    assignedRoleCount: assignments.length,
    unownedRoles: recipeRoles.filter((role) => !assignmentCounts[role]),
    duplicateRoles: recipeRoles.filter((role) => (assignmentCounts[role] ?? 0) > 1),
    unknownRoles: assignments.filter((assignment) => !recipeRoles.includes(assignment.role)),
    ownership: THEME_TYPOGRAPHY_OWNERSHIP,
  };
}

/**
 * Product-level controls required for predictable authoring. These are kept
 * separate from the lower-level recipe registry so a technically resolvable
 * token cannot be mistaken for an understandable, centralized author control.
 */
export const THEME_MACRO_CONTROL_INVENTORY: ThemeMacroControlInventoryItem[] = [
  {
    id: 'global-app-font',
    label: 'Global application font',
    layer: 'foundation',
    status: 'governed',
    currentPath: 'UI, Reading, and Display Foundation families compile through explicit inherited role references; the editor discloses inherited-role impact and local overrides.',
    requiredOutcome: 'One centralized foundation control with visible inherited and overridden typography roles.',
  },
  {
    id: 'primary-actions',
    label: 'Primary action controls',
    layer: 'shared-system',
    status: 'governed',
    currentPath: 'One explicit Primary action recipe compiles background, text, border, and hover variables for verified commit and proceed controls; selected and support controls remain separate.',
    requiredOutcome: 'One shared Primary action recipe governing background, text, border, hover, focus, and disabled treatment.',
  },
  {
    id: 'reader-type-chip',
    label: 'Reader tile Type chip',
    layer: 'shared-system',
    status: 'governed',
    currentPath: 'One explicit Type chip recipe compiles shared background, text, border, and hover identity while grid, rail, and compact contexts retain proportional geometry.',
    requiredOutcome: 'A directly accessible shared Type chip recipe inherited by every Reader tile context unless deliberately overridden.',
  },
  {
    id: 'reader-grid-spacing',
    label: 'Reader content-grid spacing',
    layer: 'layout',
    status: 'governed',
    currentPath: 'One explicit Content Grid gap recipe selects from the governed spacing scale; minimum tile widths and responsive reflow remain fixed component safeguards.',
    requiredOutcome: 'A governed macro spacing control that reflows the grid while preserving responsive and minimum-size guardrails.',
  },
  {
    id: 'question-watermark-scale',
    label: 'Question watermark scale',
    layer: 'component',
    status: 'governed',
    currentPath: 'Question opacity and a bounded proportional scale compile through explicit treatment recipes shared by grid, Reveal, open detail, rails, and Compose preview.',
    requiredOutcome: 'Expose watermark scale as a Question treatment while retaining fitting and readability safeguards in code.',
  },
  {
    id: 'responsive-fitting',
    label: 'Responsive fitting and accessibility safeguards',
    layer: 'guardrail',
    status: 'fixed-guardrail',
    currentPath: 'Component logic owns responsive breakpoints, overflow prevention, minimum readable sizes, and touch targets.',
    requiredOutcome: 'Keep safety behavior non-authorable while allowing governed visual inputs within those limits.',
  },
];

export type ThemeCompatibilityPathStatus = 'removed' | 'retained-safety' | 'retained-intentional';

export interface ThemeCompatibilityPathInventoryItem {
  id: string;
  status: ThemeCompatibilityPathStatus;
  boundary: string;
  rationale: string;
}

export const THEME_COMPATIBILITY_PATH_INVENTORY: ThemeCompatibilityPathInventoryItem[] = [
  {
    id: 'preset-role-alias-overrides',
    status: 'removed',
    boundary: 'theme compiler',
    rationale: 'Journal and Editorial defaults are materialized in recipes; post-recipe aliases could overwrite authored values.',
  },
  {
    id: 'workbench-reader-aliases',
    status: 'removed',
    boundary: 'Theme Management Administration chrome',
    rationale: 'Workbench chrome consumes explicit Administration aliases; Reader aliases remain only inside Reader preview surfaces.',
  },
  {
    id: 'static-theme-fallback',
    status: 'retained-safety',
    boundary: 'src/app/theme.css',
    rationale: 'Provides delivery-safe tokens before or when runtime theme injection is unavailable; it is not an authoring source.',
  },
  {
    id: 'admin-modal-atomic-fallback',
    status: 'retained-safety',
    boundary: 'legacy modal shell fallbacks',
    rationale: 'Admin aliases remain primary while atomic layout fallbacks prevent an unreadable shell during incomplete injection.',
  },
  {
    id: 'compose-reader-preview-aliases',
    status: 'retained-intentional',
    boundary: 'Compose Reader preview',
    rationale: 'The preview deliberately renders Reader presentation and therefore must consume Reader recipes rather than Administration chrome.',
  },
  {
    id: 'image-action-contrast-literals',
    status: 'retained-intentional',
    boundary: 'Media and card image-overlay actions',
    rationale: 'Fixed black and white action chrome guarantees contrast over unpredictable imagery and is not semantic feedback state.',
  },
];

const TOKEN_BINDING_PATHS: Record<string, string> = {
  foundationUiFamily: 'foundationTypography.uiFamily',
  foundationReadingFamily: 'foundationTypography.readingFamily',
  foundationDisplayFamily: 'foundationTypography.displayFamily',
  storyClosedPadding: 'surfaces.storyCardClosed.padding',
  galleryClosedPadding: 'surfaces.galleryCardClosed.padding',
  questionClosedPadding: 'surfaces.qaCardClosed.padding',
  storyClosedExcerptLineHeight: 'typography.storyExcerpt.lineHeight',
  calloutBulletLineHeight: 'treatments.calloutBodyListLineHeight',
};

const RECIPE_GROUP_BY_BINDING_KIND: Partial<Record<ReaderThemeComponentBinding['kind'], keyof ReaderThemeRecipes>> = {
  typography: 'typography',
  surface: 'surfaces',
  control: 'controls',
  tag: 'tags',
  overlay: 'overlays',
  iconography: 'iconography',
  treatment: 'treatments',
};

function hasPath(root: unknown, path: string): boolean {
  const value = path.split('.').reduce<unknown>((current, part) => (
    current && typeof current === 'object'
      ? (current as Record<string, unknown>)[part]
      : undefined
  ), root);
  return value !== undefined && value !== null && value !== '';
}

export function getReaderThemeBindingPath(binding: ReaderThemeComponentBinding): string | null {
  if (binding.kind === 'token') return TOKEN_BINDING_PATHS[binding.key] ?? null;
  const group = RECIPE_GROUP_BY_BINDING_KIND[binding.kind];
  return group ? `${group}.${binding.key}` : null;
}

export interface ReaderThemeBindingAuditItem {
  componentId: string;
  variantId: string;
  elementId: string;
  binding: ReaderThemeComponentBinding;
  recipePath: string | null;
  resolved: boolean;
}

export function auditReaderThemeComponentBindings(
  recipes: ReaderThemeRecipes = DEFAULT_READER_THEME_RECIPES
): ReaderThemeBindingAuditItem[] {
  return CURRENT_READER_THEME_COMPONENTS.flatMap((component) =>
    component.variants.flatMap((variant) =>
      variant.elements.map((element) => {
        const recipePath = getReaderThemeBindingPath(element.binding);
        return {
          componentId: component.id,
          variantId: variant.id,
          elementId: element.id,
          binding: element.binding,
          recipePath,
          resolved: Boolean(recipePath && hasPath(recipes, recipePath)),
        };
      })
    )
  );
}

export function buildThemeContractInventory() {
  const bindings = auditReaderThemeComponentBindings();
  const typography = auditTypographyOwnership();
  return {
    componentCount: CURRENT_READER_THEME_COMPONENTS.length,
    variantCount: CURRENT_READER_THEME_COMPONENTS.reduce((count, component) => count + component.variants.length, 0),
    bindingCount: bindings.length,
    unresolvedBindings: bindings.filter((binding) => !binding.resolved),
    macroControls: THEME_MACRO_CONTROL_INVENTORY,
    compatibilityPaths: THEME_COMPATIBILITY_PATH_INVENTORY,
    typography,
  };
}
