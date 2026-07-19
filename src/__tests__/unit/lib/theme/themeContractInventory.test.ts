import {
  auditTypographyOwnership,
  auditReaderThemeComponentBindings,
  buildThemeContractInventory,
  THEME_MACRO_CONTROL_INVENTORY,
  THEME_COMPATIBILITY_PATH_INVENTORY,
} from '@/lib/theme/themeContractInventory';

describe('theme contract inventory', () => {
  it('resolves every registered Reader component attribute to a governed recipe path', () => {
    const bindings = auditReaderThemeComponentBindings();
    expect(bindings.length).toBeGreaterThan(0);
    expect(bindings.filter((binding) => !binding.resolved)).toEqual([]);
  });

  it('keeps the approved macro-control examples visible in the enforcement inventory', () => {
    expect(THEME_MACRO_CONTROL_INVENTORY.map((item) => item.id)).toEqual(expect.arrayContaining([
      'global-app-font',
      'primary-actions',
      'reader-type-chip',
      'reader-grid-spacing',
      'question-watermark-scale',
      'responsive-fitting',
    ]));
  });

  it('registers Primary action separately from selected and support controls', () => {
    const bindings = auditReaderThemeComponentBindings();
    expect(bindings.some((item) => item.binding.kind === 'control' && item.binding.key === 'primaryAction')).toBe(true);
    expect(bindings.some((item) => item.binding.kind === 'control' && item.binding.key === 'chromeActiveTab')).toBe(true);
    expect(bindings.some((item) => item.binding.kind === 'control' && item.binding.key === 'supportControlStrong')).toBe(true);
  });

  it('registers the Reader Type chip as its own shared control', () => {
    const bindings = auditReaderThemeComponentBindings();
    expect(bindings.some((item) => item.binding.kind === 'control' && item.binding.key === 'typeChip')).toBe(true);
  });

  it('registers Content Grid spacing as an explicit layout treatment', () => {
    const bindings = auditReaderThemeComponentBindings();
    expect(bindings.some((item) => item.componentId === 'contentGrid'
      && item.binding.kind === 'treatment'
      && item.binding.key === 'contentGridGap')).toBe(true);
  });

  it('registers Question watermark opacity and scale as component treatments', () => {
    const bindings = auditReaderThemeComponentBindings();
    const questionTreatments = bindings.filter((item) => item.componentId === 'qaCard'
      && item.binding.kind === 'treatment')
      .map((item) => item.binding.key);
    expect(questionTreatments).toEqual(expect.arrayContaining([
      'questionWatermarkOpacity',
      'questionWatermarkScale',
    ]));
  });

  it('distinguishes incomplete author controls from fixed safety guardrails', () => {
    const inventory = buildThemeContractInventory();
    expect(inventory.macroControls.filter((item) => item.status === 'governed')).toHaveLength(5);
    expect(inventory.macroControls.filter((item) => item.status === 'partial')).toHaveLength(0);
    expect(inventory.macroControls.filter((item) => item.status === 'fixed-guardrail')).toHaveLength(1);
  });

  it('contains every remaining compatibility path as explicit safety or intentional behavior', () => {
    expect(THEME_COMPATIBILITY_PATH_INVENTORY.filter((item) => item.status === 'removed')).toHaveLength(2);
    expect(THEME_COMPATIBILITY_PATH_INVENTORY.filter((item) => item.status === 'retained-safety')).toHaveLength(2);
    expect(THEME_COMPATIBILITY_PATH_INVENTORY.filter((item) => item.status === 'retained-intentional')).toHaveLength(2);
    expect(THEME_COMPATIBILITY_PATH_INVENTORY.every((item) => item.boundary && item.rationale)).toBe(true);
  });

  it('assigns every current typography recipe to exactly one semantic owner', () => {
    const audit = auditTypographyOwnership();
    expect(audit.recipeRoleCount).toBeGreaterThan(0);
    expect(audit.assignedRoleCount).toBe(audit.recipeRoleCount);
    expect(audit.unownedRoles).toEqual([]);
    expect(audit.duplicateRoles).toEqual([]);
    expect(audit.unknownRoles).toEqual([]);
  });

  it('preserves component override slots without treating card type as an automatic variant', () => {
    const audit = auditTypographyOwnership();
    const story = audit.ownership.find((item) => item.id === 'story-overrides');
    const gallery = audit.ownership.find((item) => item.id === 'gallery-overrides');
    expect(story?.status).toBe('needs-inheritance');
    expect(gallery?.status).toBe('needs-inheritance');
    expect(story?.legitimateVariants).not.toContain('card-type');
    expect(gallery?.legitimateVariants).not.toContain('card-type');
  });
});
