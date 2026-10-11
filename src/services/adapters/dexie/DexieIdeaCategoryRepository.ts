import { posDexieDb } from './posDexieDb';
import {
  IdeaCategory,
  CreateIdeaCategoryDTO,
  UpdateIdeaCategoryDTO,
  DEFAULT_IDEA_CATEGORY_NAMES,
} from '../../../types/ideaCategory.types';
import { IIdeaCategoryRepository } from '../../contracts/IIdeaCategoryRepository';
import { generateId } from '../../../utils/idGenerator';

/** Stable ID for system-seeded defaults — can never be duplicated accidentally. */
export function defaultCategoryId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `cat-default-${slug}`;
}

const normalizeName = (name: string): string => name.trim().toLowerCase();

/**
 * Dexie-backed Idea Category storage (schema v15).
 *
 * Seeding is deterministic + idempotent + race-safe:
 *  - defaults carry STABLE ids (cat-default-…), so concurrent seeders
 *    write the SAME rows (put = upsert by primary key);
 *  - the whole seed/dedupe pass runs inside ONE transaction;
 *  - a module-level in-flight promise merges concurrent callers.
 *
 * Legacy duplicate rows (random ids from the old racy seeder) are
 * collapsed by normalized name; captures referencing a removed
 * duplicate are remapped to the surviving canonical category so no
 * historical relation is lost.
 *
 * Categories are archived rather than deleted whenever any capture
 * still references them.
 */
export class DexieIdeaCategoryRepository implements IIdeaCategoryRepository {
  private static seeding: Promise<void> | null = null;

  private ensureSeeded(): Promise<void> {
    if (!DexieIdeaCategoryRepository.seeding) {
      DexieIdeaCategoryRepository.seeding = this.seedAndDedupe().finally(() => {
        DexieIdeaCategoryRepository.seeding = null;
      });
    }
    return DexieIdeaCategoryRepository.seeding;
  }

  private async seedAndDedupe(): Promise<void> {
    await posDexieDb.transaction('rw', [posDexieDb.idea_categories, posDexieDb.captures], async () => {
      const existing = await posDexieDb.idea_categories.toArray();

      // ── Dedupe by normalized name (legacy duplicate cleanup) ──
      const byName = new Map<string, IdeaCategory[]>();
      for (const cat of existing) {
        const key = normalizeName(cat.name);
        const bucket = byName.get(key) ?? [];
        bucket.push(cat);
        byName.set(key, bucket);
      }
      const removedIds: string[] = [];
      const remap = new Map<string, string>();
      for (const bucket of byName.values()) {
        if (bucket.length <= 1) continue;
        const canonical =
          bucket.find((c) => c.id === defaultCategoryId(c.name)) ??
          [...bucket].sort(
            (a, b) => a.created_at.localeCompare(b.created_at) || a.sort_order - b.sort_order
          )[0];
        for (const dup of bucket) {
          if (dup.id === canonical.id) continue;
          removedIds.push(dup.id);
          remap.set(dup.id, canonical.id);
        }
      }
      if (removedIds.length > 0) {
        await posDexieDb.idea_categories.bulkDelete(removedIds);
        // Remap capture relations to the canonical category.
        const captures = await posDexieDb.captures.toArray();
        for (const cap of captures) {
          const meta = cap.metadata as Record<string, unknown> | undefined;
          const ref = meta?.idea_category_id;
          if (typeof ref === 'string' && remap.has(ref)) {
            await posDexieDb.captures.put({
              ...cap,
              metadata: { ...meta, idea_category_id: remap.get(ref) },
            });
          }
        }
      }

      // ── Seed defaults (idempotent: stable ids + name check) ──
      const survivors = await posDexieDb.idea_categories.toArray();
      const present = new Set(survivors.map((c) => normalizeName(c.name)));
      const now = new Date().toISOString();
      const maxOrder = survivors.reduce((m, c) => Math.max(m, c.sort_order), -1);
      const missing: IdeaCategory[] = [];
      DEFAULT_IDEA_CATEGORY_NAMES.forEach((name, i) => {
        if (present.has(normalizeName(name))) return;
        missing.push({
          id: defaultCategoryId(name),
          name,
          status: 'active',
          sort_order: maxOrder + 1 + i,
          created_at: now,
        });
      });
      if (missing.length > 0) {
        await posDexieDb.idea_categories.bulkPut(missing);
      }
    });
  }

  private sortCategories(list: IdeaCategory[]): IdeaCategory[] {
    return list.sort(
      (a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)
    );
  }

  async getActive(): Promise<IdeaCategory[]> {
    await this.ensureSeeded();
    const all = await posDexieDb.idea_categories.toArray();
    return this.sortCategories(all.filter((c) => c.status === 'active'));
  }

  async getAll(): Promise<IdeaCategory[]> {
    await this.ensureSeeded();
    return this.sortCategories(await posDexieDb.idea_categories.toArray());
  }

  async getById(id: string): Promise<IdeaCategory | null> {
    const rec = await posDexieDb.idea_categories.get(id);
    return rec ?? null;
  }

  async create(dto: CreateIdeaCategoryDTO): Promise<IdeaCategory> {
    await this.ensureSeeded();
    const name = dto.name.trim();
    if (!name) throw new Error('Category name cannot be empty.');
    const existing = await posDexieDb.idea_categories.toArray();
    if (existing.some((c) => normalizeName(c.name) === normalizeName(name))) {
      throw new Error(`Category "${name}" already exists.`);
    }
    const maxOrder = existing.reduce((m, c) => Math.max(m, c.sort_order), -1);
    const category: IdeaCategory = {
      id: generateId(),
      name,
      status: 'active',
      sort_order: maxOrder + 1,
      created_at: new Date().toISOString(),
    };
    await posDexieDb.idea_categories.add(category);
    return category;
  }

  async update(id: string, dto: UpdateIdeaCategoryDTO): Promise<IdeaCategory> {
    const current = await posDexieDb.idea_categories.get(id);
    if (!current) throw new Error(`Idea category with ID "${id}" not found.`);
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new Error('Category name cannot be empty.');
      const dup = await posDexieDb.idea_categories.toArray();
      if (dup.some((c) => c.id !== id && normalizeName(c.name) === normalizeName(name))) {
        throw new Error(`Category "${name}" already exists.`);
      }
    }
    const updated: IdeaCategory = {
      ...current,
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
    };
    await posDexieDb.idea_categories.put(updated);
    return updated;
  }

  async countReferences(id: string): Promise<number> {
    const captures = await posDexieDb.captures.toArray();
    return captures.filter(
      (c) => (c.metadata as Record<string, unknown> | undefined)?.idea_category_id === id
    ).length;
  }

  async remove(id: string): Promise<void> {
    const current = await posDexieDb.idea_categories.get(id);
    if (!current) throw new Error(`Idea category with ID "${id}" not found.`);
    const refs = await this.countReferences(id);
    if (refs > 0) {
      throw new Error(
        `This category is used by ${refs} idea${refs === 1 ? '' : 's'} and cannot be deleted. Archive it instead.`
      );
    }
    await posDexieDb.idea_categories.delete(id);
  }
}
