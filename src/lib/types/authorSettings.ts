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

export const authorSettingsSchema = z.object({
  galleryTagInheritance: galleryTagInheritanceTogglesSchema,
});

export type AuthorSettings = z.infer<typeof authorSettingsSchema>;

export const DEFAULT_AUTHOR_SETTINGS: AuthorSettings = {
  galleryTagInheritance: { ...DEFAULT_GALLERY_TAG_INHERITANCE_TOGGLES },
};
