import {
  Practice,
  CreatePracticeDTO,
  UpdatePracticeDTO,
  PracticeFilter,
  PointLedgerEvent,
  PointSourceType,
  RecordPointEventDTO,
  PointLedgerFilter,
  PracticeMetrics,
} from '../../types/practice.types';

export interface IPracticeRepository {
  // ─── Practice Definitions ──────────────────────────────────
  getPractices(filter?: PracticeFilter): Promise<Practice[]>;
  getPractice(id: string): Promise<Practice | null>;
  createPractice(dto: CreatePracticeDTO): Promise<Practice>;
  updatePractice(id: string, dto: UpdatePracticeDTO): Promise<Practice>;
  archivePractice(id: string): Promise<Practice>;
  deletePractice(id: string): Promise<boolean>;

  // ─── Point Ledger Operations ────────────────────────────────
  recordPointEvent(dto: RecordPointEventDTO): Promise<PointLedgerEvent>;
  createAdjustment(originalEventId: string, correctionPoints: number, reason: string): Promise<PointLedgerEvent>;
  getLedgerEvents(filter?: PointLedgerFilter): Promise<PointLedgerEvent[]>;
  getLedgerEventBySource(sourceType: PointSourceType, sourceId: string): Promise<PointLedgerEvent | null>;
  voidLedgerEventsBySource(sourceType: PointSourceType, sourceId: string): Promise<number>;
  getPracticeMetrics(timeRange?: { start: string; end: string }): Promise<PracticeMetrics>;

  // ─── Level Requirement Integration ─────────────────────────
  getPointsForCriteria(criteria: {
    life_area_id?: string;
    skill_id?: string;
    goal_id?: string;
    startDate?: string;
  }): Promise<number>;

  // ─── Development Point Query Services (Module 08 Final) ────
  /** Sum of valid point events matching the filter. Single bounded query. */
  sumValidPoints(filter?: PointLedgerFilter): Promise<number>;

  /**
   * Most recent valid point events, newest first, bounded by `limit`.
   * Never loads the full ledger.
   */
  getRecentPointEvents(filter?: PointLedgerFilter, limit?: number): Promise<PointLedgerEvent[]>;
}
