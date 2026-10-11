import { useCallback, useEffect, useState } from 'react';
import { IdeaCategory } from '../types/ideaCategory.types';
import { useIdeaCategoryRepo } from '../app/providers/RepositoryProvider';

/**
 * User-defined Idea Categories. Selectors receive ACTIVE categories
 * only; management surfaces use the full list (archived included,
 * never deleted). Defaults are seeded once by the repository.
 */
export function useIdeaCategories() {
  const repo = useIdeaCategoryRepo();
  const [active, setActive] = useState<IdeaCategory[]>([]);
  const [all, setAll] = useState<IdeaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [a, list] = await Promise.all([repo.getActive(), repo.getAll()]);
      setActive(a);
      setAll(list);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string) => {
      const created = await repo.create({ name });
      await refresh();
      return created;
    },
    [repo, refresh]
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const updated = await repo.update(id, { name });
      await refresh();
      return updated;
    },
    [repo, refresh]
  );

  const archive = useCallback(
    async (id: string) => {
      const updated = await repo.update(id, { status: 'archived' });
      await refresh();
      return updated;
    },
    [repo, refresh]
  );

  const restore = useCallback(
    async (id: string) => {
      const updated = await repo.update(id, { status: 'active' });
      await refresh();
      return updated;
    },
    [repo, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.remove(id);
      await refresh();
    },
    [repo, refresh]
  );

  const countReferences = useCallback(
    async (id: string) => repo.countReferences(id),
    [repo]
  );

  return { active, all, loading, error, refresh, create, rename, archive, restore, remove, countReferences };
}

/** Resolve a category id → display name ("Uncategorized" fallback). */
export function categoryLabel(
  categoryId: unknown,
  categories: IdeaCategory[]
): string | null {
  if (typeof categoryId !== 'string' || !categoryId) return null;
  return categories.find((c) => c.id === categoryId)?.name ?? 'Uncategorized';
}
