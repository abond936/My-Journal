import {
  DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  normalizeAuthorSettings,
} from '@/lib/types/authorSettings';

describe('normalizeAuthorSettings', () => {
  it('preserves perspective from a partial settings document', () => {
    expect(normalizeAuthorSettings({ archivePerspectivePersonId: 'alan' })).toEqual({
      galleryTagInheritance: DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
      galleryTagInheritanceConfigured: false,
      classificationRequirements: { media: true, cards: true },
      archivePerspectivePersonId: 'alan',
    });
  });

  it('preserves valid inheritance settings alongside perspective', () => {
    const galleryTagInheritance = { who: true, what: false, when: true, where: false };
    expect(normalizeAuthorSettings({ galleryTagInheritance, archivePerspectivePersonId: 'alan' })).toEqual({
      galleryTagInheritance,
      galleryTagInheritanceConfigured: false,
      classificationRequirements: { media: true, cards: true },
      archivePerspectivePersonId: 'alan',
    });
  });

  it('preserves independent Media and Card classification requirements', () => {
    expect(
      normalizeAuthorSettings({
        classificationRequirements: { media: true, cards: false },
      }).classificationRequirements
    ).toEqual({ media: true, cards: false });
  });
});
