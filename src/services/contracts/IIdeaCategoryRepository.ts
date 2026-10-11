import {
  IdeaCategory,
  CreateIdeaCategoryDTO,
  UpdateIdeaCategoryDTO,
} from '../../types/ideaCategory.types';

/**
 * Idea Categories are user-defined labels managed exclusively from
 * Settings. Categories are archived, never hard-deleted: historical
 * captures keep resolvable associations forever.
 */
export interface IIdeaCategoryRepository {
  /** Active categories only (composer selectors). Seeds defaults idempotently on first read. */
  getActive(): Promise<IdeaCategory[]>;
  /** All categories including archived (settings management + name resolution). */
  getAll(): Promise<IdeaCategory[]>;
  getById(id: string): Promise<IdeaCategory | null>;
  create(dto: CreateIdeaCategoryDTO): Promise<IdeaCategory>;
  update(id: string, dto: UpdateIdeaCategoryDTO): Promise<IdeaCategory>;
  /** Number of captures referencing this category via metadata.idea_category_id. */
  countReferences(id: string): Promise<number>;
  /**
   * Permanent delete. ONLY allowed when countReferences(id) === 0;
   * otherwise the implementation must throw. Referenced categories
   * are archived instead — historical relations are never destroyed.
   */
  remove(id: string): Promise<void>;
}
