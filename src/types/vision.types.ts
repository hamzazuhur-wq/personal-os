export type VisionItemKind = 'strength' | 'weakness' | 'challenge';
export type VisionRecordStatus = 'active' | 'archived';

export interface Vision {
  id: string;
  user_id: string;
  long_term_direction: string;
  desired_identity: string;
  definition_of_success: string;
  why_it_matters: string;
  short_statement?: string;
  created_at: string;
  updated_at: string;
}

export interface LifeArea {
  id: string;
  name: string;
  short_direction?: string;
  sort_order: number;
  status: VisionRecordStatus;
  created_at: string;
  updated_at: string;
}

export interface AreaVision {
  id: string;
  life_area_id: string;
  title: string;
  desired_identity: string;
  definition_of_success: string;
  why_it_matters: string;
  created_at: string;
  updated_at: string;
}

export interface CurrentState {
  id: string;
  life_area_id: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface VisionItem {
  id: string;
  life_area_id: string;
  kind: VisionItemKind;
  text: string;
  status: VisionRecordStatus;
  created_at: string;
  updated_at: string;
}

export type SaveVisionDTO = Omit<Vision, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type SaveAreaVisionDTO = Omit<AreaVision, 'id' | 'life_area_id' | 'created_at' | 'updated_at'>;
export type SaveCurrentStateDTO = Pick<CurrentState, 'summary'>;
