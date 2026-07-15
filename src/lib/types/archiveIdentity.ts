import { z } from 'zod';

export const partialDateSchema = z
  .object({
    year: z.number().int().min(1).max(9999),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.day && !value.month) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A day requires a month.' });
    }
  });

export const personAliasSchema = z.object({
  name: z.string().trim().min(1).max(200),
  validFrom: partialDateSchema.optional(),
  validTo: partialDateSchema.optional(),
});

export const personSchema = z
  .object({
    docId: z.string().optional(),
    kind: z.enum(['human', 'nonhuman']).default('human'),
    canonicalName: z.string().trim().min(1).max(200),
    aliases: z.array(personAliasSchema).default([]),
    gender: z.enum(['female', 'male', 'nonbinary', 'unknown']).optional(),
    linkedWhoTagId: z.string().trim().min(1).optional(),
    legacyWhoTagIds: z.array(z.string().trim().min(1)).default([]),
    status: z.enum(['active', 'merged']).default('active'),
    mergedIntoPersonId: z.string().trim().min(1).optional(),
    notes: z.string().max(2000).optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'merged' && !value.mergedIntoPersonId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mergedIntoPersonId'],
        message: 'Merged people require a destination person.',
      });
    }
    const names = [value.canonicalName, ...value.aliases.map((alias) => alias.name)].map((name) =>
      name.trim().toLowerCase()
    );
    if (new Set(names).size !== names.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['aliases'],
        message: 'Canonical name and aliases must be unique for a person.',
      });
    }
  });

export const personRelationshipSchema = z
  .object({
    docId: z.string().optional(),
    fromPersonId: z.string().trim().min(1),
    toPersonId: z.string().trim().min(1),
    type: z.enum(['parent', 'spouse', 'partner']),
    validFrom: partialDateSchema.optional(),
    validTo: partialDateSchema.optional(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
  })
  .refine((value) => value.fromPersonId !== value.toPersonId, {
    message: 'A person cannot have a relationship with themselves.',
  });

export const personGroupSchema = z
  .object({
    docId: z.string().optional(),
    name: z.string().trim().min(1).max(200),
    type: z.enum(['couple', 'family', 'household']),
    memberPersonIds: z.array(z.string().trim().min(1)).min(2),
    legacyWhoTagIds: z.array(z.string().trim().min(1)).default([]),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
  })
  .superRefine((value, ctx) => {
    if (new Set(value.memberPersonIds).size !== value.memberPersonIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['memberPersonIds'],
        message: 'Group members must be unique.',
      });
    }
    if (value.type === 'couple' && value.memberPersonIds.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['memberPersonIds'],
        message: 'A couple must contain exactly two people.',
      });
    }
  });

export type PartialDate = z.infer<typeof partialDateSchema>;
export type PersonAlias = z.infer<typeof personAliasSchema>;
export type Person = z.infer<typeof personSchema>;
export type PersonRelationship = z.infer<typeof personRelationshipSchema>;
export type PersonGroup = z.infer<typeof personGroupSchema>;
