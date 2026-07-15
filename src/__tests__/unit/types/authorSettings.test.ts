import {
  DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
  normalizeAuthorSettings,
} from '@/lib/types/authorSettings';

describe('normalizeAuthorSettings', () => {
  it('preserves perspective from a partial settings document', () => {
    expect(normalizeAuthorSettings({ archivePerspectivePersonId: 'alan' })).toEqual({
      galleryTagInheritance: DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES,
      galleryTagInheritanceConfigured: false,
      archivePerspectivePersonId: 'alan',
    });
  });

  it('preserves valid inheritance settings alongside perspective', () => {
    const galleryTagInheritance = { who: true, what: false, when: true, where: false };
    expect(normalizeAuthorSettings({ galleryTagInheritance, archivePerspectivePersonId: 'alan' })).toEqual({
      galleryTagInheritance,
      galleryTagInheritanceConfigured: false,
      archivePerspectivePersonId: 'alan',
    });
  });
});
