import { useCallback, useEffect, useState } from 'react';
import { useVisionRepo } from '../app/providers/RepositoryProvider';
import { AreaVision, CurrentState, LifeArea, SaveAreaVisionDTO, SaveCurrentStateDTO, SaveVisionDTO, Vision, VisionItem, VisionItemKind } from '../types/vision.types';

export function useVision() {
  const repo = useVisionRepo();
  const [vision, setVision] = useState<Vision | null>(null);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>([]);
  const [areaVisions, setAreaVisions] = useState<Record<string, AreaVision | null>>({});
  const [currentStates, setCurrentStates] = useState<Record<string, CurrentState | null>>({});
  const [items, setItems] = useState<Record<string, VisionItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [savedVision, areas] = await Promise.all([repo.getVision(), repo.getLifeAreas()]);
      const details = await Promise.all(areas.map(async (area) => [area.id, await repo.getAreaVision(area.id), await repo.getCurrentState(area.id), await repo.getItems(area.id)] as const));
      setVision(savedVision); setLifeAreas(areas);
      setAreaVisions(Object.fromEntries(details.map(([id, areaVision]) => [id, areaVision])));
      setCurrentStates(Object.fromEntries(details.map(([id, , currentState]) => [id, currentState])));
      setItems(Object.fromEntries(details.map(([id, , , areaItems]) => [id, areaItems])));
    } catch (err) { console.error('Failed to load vision data:', err); setError('Unable to load your Vision data.'); }
    finally { setLoading(false); }
  }, [repo]);

  useEffect(() => { refresh(); }, [refresh]);
  const run = async <T,>(action: () => Promise<T>) => { const result = await action(); await refresh(); return result; };

  return {
    vision, lifeAreas, areaVisions, currentStates, items, loading, error, refresh,
    saveVision: (dto: SaveVisionDTO) => run(() => repo.saveVision(dto)),
    createLifeArea: (name: string, shortDirection?: string) => run(() => repo.createLifeArea(name, shortDirection)),
    updateLifeArea: (id: string, dto: Pick<LifeArea, 'name' | 'short_direction'>) => run(() => repo.updateLifeArea(id, dto)),
    archiveLifeArea: (id: string) => run(() => repo.archiveLifeArea(id)),
    reorderLifeAreas: (ids: string[]) => run(() => repo.reorderLifeAreas(ids)),
    saveAreaVision: (id: string, dto: SaveAreaVisionDTO) => run(() => repo.saveAreaVision(id, dto)),
    saveCurrentState: (id: string, dto: SaveCurrentStateDTO) => run(() => repo.saveCurrentState(id, dto)),
    createItem: (id: string, kind: VisionItemKind, text: string) => run(() => repo.createItem(id, kind, text)),
    updateItem: (id: string, text: string) => run(() => repo.updateItem(id, text)),
    archiveItem: (id: string) => run(() => repo.archiveItem(id)),
  };
}
