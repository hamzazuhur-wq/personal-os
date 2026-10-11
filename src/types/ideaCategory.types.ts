// ============================================================
// MODULE 11 — IDEA CATEGORIES (user-defined labels)
// ============================================================
// Categories are USER DATA: free labels for Ideas managed from
// Settings. They are NOT capture types and NOT entity types.
// Legacy capture_type values are historical metadata only and
// never participate in this system.
// ============================================================

export interface IdeaCategory {
  id: string;
  name: string;
  status: 'active' | 'archived';
  sort_order: number;
  created_at: string;
}

export interface CreateIdeaCategoryDTO {
  name: string;
}

export interface UpdateIdeaCategoryDTO {
  name?: string;
  status?: 'active' | 'archived';
  sort_order?: number;
}

/** Default categories seeded once on first read (never hard-coded in UI). */
export const DEFAULT_IDEA_CATEGORY_NAMES = [
  'General Idea',
  'Business Idea',
  'Creative Idea',
  'Personal Idea',
] as const;

export const UNCATEGORIZED_LABEL = 'Uncategorized';
