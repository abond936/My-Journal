import { z } from 'zod';

export const audienceSelectionSchema = z.object({
  allContacts: z.boolean().default(false),
  groupIds: z.array(z.string().min(1)).default([]),
  contactIds: z.array(z.string().min(1)).default([]),
});

export const audienceGroupSchema = z.object({
  docId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  memberContactIds: z.array(z.string().min(1)).default([]),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type AudienceSelection = z.infer<typeof audienceSelectionSchema>;
export type AudienceGroup = z.infer<typeof audienceGroupSchema>;
