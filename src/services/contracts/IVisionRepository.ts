import {
  AreaVision,
  CurrentState,
  LifeArea,
  SaveAreaVisionDTO,
  SaveCurrentStateDTO,
  SaveVisionDTO,
  Vision,
  VisionItem,
  VisionItemKind,
} from '../../types/vision.types';

export interface IVisionRepository {
  getVision(): Promise<Vision | null>;
  saveVision(dto: SaveVisionDTO): Promise<Vision>;
  getLifeAreas(includeArchived?: boolean): Promise<LifeArea[]>;
  createLifeArea(name: string, shortDirection?: string): Promise<LifeArea>;
  updateLifeArea(id: string, dto: Pick<LifeArea, 'name' | 'short_direction'>): Promise<LifeArea>;
  archiveLifeArea(id: string): Promise<LifeArea>;
  reorderLifeAreas(orderedIds: string[]): Promise<LifeArea[]>;
  getAreaVision(lifeAreaId: string): Promise<AreaVision | null>;
  saveAreaVision(lifeAreaId: string, dto: SaveAreaVisionDTO): Promise<AreaVision>;
  getCurrentState(lifeAreaId: string): Promise<CurrentState | null>;
  saveCurrentState(lifeAreaId: string, dto: SaveCurrentStateDTO): Promise<CurrentState>;
  getItems(lifeAreaId: string, kind?: VisionItemKind): Promise<VisionItem[]>;
  createItem(lifeAreaId: string, kind: VisionItemKind, text: string): Promise<VisionItem>;
  updateItem(id: string, text: string): Promise<VisionItem>;
  archiveItem(id: string): Promise<VisionItem>;
}
