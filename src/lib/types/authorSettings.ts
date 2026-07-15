import { z } from 'zod';

export const galleryTagInheritanceTogglesSchema = z.object({
  who: z.boolean(),
  what: z.boolean(),
  when: z.boolean(),
  where: z.boolean(),
});

export type GalleryTagInheritanceToggles = z.infer<typeof galleryTagInheritanceTogglesSchema>;

export const DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES: GalleryTagInheritanceToggles = {
  who: false,
  what: false,
  when: false,
  where: false,
};

export const tagSet0StatusSchema = z.object({
  installed: z.boolean(),
  tagCount: z.number().int().nonnegative(),
  installedAt: z.string().optional(),
});

export type TagSet0Status = z.infer<typeof tagSet0StatusSchema>;

export const authorSettingsSchema = z.object({
  galleryTagInheritance: galleryTagInheritanceTogglesSchema,
  tagSet0: tagSet0StatusSchema.optional(),
  archivePerspectivePersonId: z.string().min(1).optional(),
});

export type AuthorSettings = z.infer<typeof authorSettingsSchema>;

export const DEFAULT_AUTHOR_SETTINGS: AuthorSettings = {
  galleryTagInheritance: { ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES },
};

export const DEFAULT_TAG_SET_0_STATUS: TagSet0Status = {
  installed: false,
  tagCount: 0,
};

export function normalizeAuthorSettings(raw: unknown): AuthorSettings {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const gallery = galleryTagInheritanceTogglesSchema.safeParse(source.galleryTagInheritance);
  const tagSet = tagSet0StatusSchema.safeParse(source.tagSet0);
  const perspective = z.string().min(1).safeParse(source.archivePerspectivePersonId);
  return {
    galleryTagInheritance: gallery.success
      ? gallery.data
      : { ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES },
    ...(tagSet.success ? { tagSet0: tagSet.data } : {}),
    ...(perspective.success ? { archivePerspectivePersonId: perspective.data } : {}),
  };
}
