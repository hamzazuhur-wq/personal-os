import { IVisionRepository } from '../../contracts/IVisionRepository';
import { posDexieDb } from './posDexieDb';
import { generateId } from '../../../utils/idGenerator';
import { AreaVision, CurrentState, LifeArea, SaveAreaVisionDTO, SaveCurrentStateDTO, SaveVisionDTO, Vision, VisionItem, VisionItemKind } from '../../../types/vision.types';

const DEFAULT_LIFE_AREAS = ['Professional', 'Physical', 'Cognitive', 'Psychological', 'Financial', 'Relationships', 'Personal', 'Knowledge & Learning'];
const MAIN_VISION_ID = 'vision-main';

export class DexieVisionRepository implements IVisionRepository {
  async getVision(): Promise<Vision | null> {
    return (await posDexieDb.visions.get(MAIN_VISION_ID)) ?? null;
  }

  async saveVision(dto: SaveVisionDTO): Promise<Vision> {
    const now = new Date().toISOString();
    const existing = await this.getVision();
    const vision: Vision = {
      id: MAIN_VISION_ID,
      user_id: 'default',
      long_term_direction: dto.long_term_direction.trim(),
      desired_identity: dto.desired_identity.trim(),
      definition_of_success: dto.definition_of_success.trim(),
      why_it_matters: dto.why_it_matters.trim(),
      short_statement: dto.short_statement?.trim() || undefined,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    await posDexieDb.visions.put(vision);
    return vision;
  }

  async getLifeAreas(includeArchived = false): Promise<LifeArea[]> {
    await posDexieDb.transaction('rw', posDexieDb.life_areas, async () => {
      if (await posDexieDb.life_areas.count() > 0) return;
      const now = new Date().toISOString();
      await posDexieDb.life_areas.bulkAdd(DEFAULT_LIFE_AREAS.map((name, sort_order) => ({ id: generateId(), name, status: 'active' as const, sort_order, created_at: now, updated_at: now })));
    });
    const areas = await posDexieDb.life_areas.orderBy('sort_order').toArray();
    return includeArchived ? areas : areas.filter((area) => area.status === 'active');
  }

  async createLifeArea(name: string, shortDirection?: string): Promise<LifeArea> {
    const now = new Date().toISOString();
    const lastArea = await posDexieDb.life_areas.orderBy('sort_order').last();
    const area: LifeArea = { id: generateId(), name: name.trim(), short_direction: shortDirection?.trim() || undefined, status: 'active', sort_order: (lastArea?.sort_order ?? -1) + 1, created_at: now, updated_at: now };
    await posDexieDb.life_areas.add(area);
    return area;
  }

  async updateLifeArea(id: string, dto: Pick<LifeArea, 'name' | 'short_direction'>): Promise<LifeArea> {
    const area = await posDexieDb.life_areas.get(id);
    if (!area) throw new Error('Life Area not found.');
    const updated = { ...area, name: dto.name.trim(), short_direction: dto.short_direction?.trim() || undefined, updated_at: new Date().toISOString() };
    await posDexieDb.life_areas.put(updated);
    return updated;
  }

  async archiveLifeArea(id: string): Promise<LifeArea> {
    const area = await posDexieDb.life_areas.get(id);
    if (!area) throw new Error('Life Area not found.');
    const updated = { ...area, status: 'archived' as const, updated_at: new Date().toISOString() };
    await posDexieDb.life_areas.put(updated);
    return updated;
  }

  async reorderLifeAreas(orderedIds: string[]): Promise<LifeArea[]> {
    const now = new Date().toISOString();
    await posDexieDb.transaction('rw', posDexieDb.life_areas, async () => {
      await Promise.all(orderedIds.map((id, sort_order) => posDexieDb.life_areas.update(id, { sort_order, updated_at: now })));
    });
    return this.getLifeAreas();
  }

  async getAreaVision(lifeAreaId: string): Promise<AreaVision | null> { return (await posDexieDb.area_visions.where('life_area_id').equals(lifeAreaId).first()) ?? null; }

  async saveAreaVision(lifeAreaId: string, dto: SaveAreaVisionDTO): Promise<AreaVision> {
    const now = new Date().toISOString();
    const existing = await this.getAreaVision(lifeAreaId);
    const record: AreaVision = { id: existing?.id ?? generateId(), life_area_id: lifeAreaId, title: dto.title.trim(), desired_identity: dto.desired_identity.trim(), definition_of_success: dto.definition_of_success.trim(), why_it_matters: dto.why_it_matters.trim(), created_at: existing?.created_at ?? now, updated_at: now };
    await posDexieDb.area_visions.put(record);
    return record;
  }

  async getCurrentState(lifeAreaId: string): Promise<CurrentState | null> { return (await posDexieDb.current_states.where('life_area_id').equals(lifeAreaId).first()) ?? null; }

  async saveCurrentState(lifeAreaId: string, dto: SaveCurrentStateDTO): Promise<CurrentState> {
    const now = new Date().toISOString();
    const existing = await this.getCurrentState(lifeAreaId);
    const record: CurrentState = { id: existing?.id ?? generateId(), life_area_id: lifeAreaId, summary: dto.summary.trim(), created_at: existing?.created_at ?? now, updated_at: now };
    await posDexieDb.current_states.put(record);
    return record;
  }

  async getItems(lifeAreaId: string, kind?: VisionItemKind): Promise<VisionItem[]> {
    const items = await posDexieDb.vision_items.where('life_area_id').equals(lifeAreaId).toArray();
    return items.filter((item) => item.status === 'active' && (!kind || item.kind === kind)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createItem(lifeAreaId: string, kind: VisionItemKind, text: string): Promise<VisionItem> {
    const now = new Date().toISOString();
    const item: VisionItem = { id: generateId(), life_area_id: lifeAreaId, kind, text: text.trim(), status: 'active', created_at: now, updated_at: now };
    await posDexieDb.vision_items.add(item);
    return item;
  }

  async updateItem(id: string, text: string): Promise<VisionItem> {
    const item = await posDexieDb.vision_items.get(id);
    if (!item) throw new Error('Vision entry not found.');
    const updated = { ...item, text: text.trim(), updated_at: new Date().toISOString() };
    await posDexieDb.vision_items.put(updated);
    return updated;
  }

  async archiveItem(id: string): Promise<VisionItem> {
    const item = await posDexieDb.vision_items.get(id);
    if (!item) throw new Error('Vision entry not found.');
    const updated = { ...item, status: 'archived' as const, updated_at: new Date().toISOString() };
    await posDexieDb.vision_items.put(updated);
    return updated;
  }
}
