import { z } from 'zod';

/**
 * Zod schema for the Tag data model.
 * This is the single source of truth for tag validation and type generation.
 */
export const tagSchema = z.object({
  // Firestore document ID (canonical)
  docId: z.string().optional(),
  name: z.string(),
  
  dimension: z.enum(['who', 'what', 'when', 'where', 'reflection']).optional(),
  
  parentId: z.string().optional(),
  
  // Array of ancestor IDs, representing the hierarchical path
  path: z.array(z.string()).optional(),
  
  order: z.number().optional(),
  description: z.string().optional(),
  
  // The number of cards directly or indirectly using this tag.
  // This will be maintained by a backend process.
  cardCount: z.number().default(0).optional(),

  // The set of unique card IDs (for unique card counting up the tree)
  uniqueCardIds: z.array(z.string()).optional(),

  // Timestamps
  createdAt: z.any().optional(), // Using any() for now to accommodate Firestore Timestamps
  updatedAt: z.any().optional(), // Using any() for now to accommodate Firestore Timestamps
});

/**
 * Inferred TypeScript type from the Zod schema.
 */
export type Tag = z.infer<typeof tagSchema>;

/**
 * Represents a tag that includes its children for building tree structures.
 * This is a client-side convenience type.
 */
export type TagWithChildren = Tag & { children: TagWithChildren[] };

/**
 * Represents tags organized by their dimensions.
 * Used for both client-side UI organization and server-side data processing.
 */
export interface OrganizedTags {
  who: string[];
  what: string[];
  when: string[];
  where: string[];
  reflection: string[];
} 