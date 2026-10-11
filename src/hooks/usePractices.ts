import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePracticeRepo } from '../app/providers/RepositoryProvider';
import {
  Practice,
  CreatePracticeDTO,
  UpdatePracticeDTO,
  PracticeFilter,
  PointLedgerEvent,
  PointLedgerFilter,
  PracticeMetrics,
} from '../types/practice.types';
import { pointService } from '../services/points/pointService';

export function usePractices(initialFilter?: PracticeFilter) {
  const repo = usePracticeRepo();

  const [practices, setPractices] = useState<Practice[]>([]);
  const [ledgerEvents, setLedgerEvents] = useState<PointLedgerEvent[]>([]);
  const [metrics, setMetrics] = useState<PracticeMetrics | null>(null);
  const [filter, setFilterState] = useState<PracticeFilter>(initialFilter || { status: 'all' });
  const [ledgerFilter, setLedgerFilterState] = useState<PointLedgerFilter>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPractices, fetchedEvents, fetchedMetrics] = await Promise.all([
        repo.getPractices(filter),
        repo.getLedgerEvents(ledgerFilter),
        repo.getPracticeMetrics(),
      ]);

      setPractices(fetchedPractices);
      setLedgerEvents(fetchedEvents);
      setMetrics(fetchedMetrics);
    } catch (err: any) {
      console.error('Failed to load practices data:', err);
      setError('Unable to load development practices.');
    } finally {
      setLoading(false);
    }
  }, [repo, filter, ledgerFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setFilter = (newFilter: Partial<PracticeFilter>) => {
    setFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  const setLedgerFilter = (newFilter: Partial<PointLedgerFilter>) => {
    setLedgerFilterState((prev) => ({ ...prev, ...newFilter }));
  };

  const createPractice = async (dto: CreatePracticeDTO): Promise<Practice> => {
    const created = await repo.createPractice(dto);
    await loadData();
    return created;
  };

  const updatePractice = async (id: string, dto: UpdatePracticeDTO): Promise<Practice> => {
    const updated = await repo.updatePractice(id, dto);
    await loadData();
    return updated;
  };

  const archivePractice = async (id: string): Promise<Practice> => {
    const archived = await repo.archivePractice(id);
    await loadData();
    return archived;
  };

  const logPracticeCompletion = async (params: {
    practiceId: string;
    note?: string;
    evidenceUrl?: string;
    goalId?: string;
    skillId?: string;
    lifeAreaId?: string;
    projectId?: string;
    taskId?: string;
    activityId?: string;
    occurredAt?: string;
  }): Promise<PointLedgerEvent> => {
    const practice = await repo.getPractice(params.practiceId);
    if (!practice) throw new Error(`Practice with ID ${params.practiceId} not found.`);

    // Centralized point service: enforces single-award idempotency per source
    // event and preserves nested relationship snapshots on the ledger.
    const event = await pointService.awardForPracticeLog({
      practice,
      note: params.note,
      evidenceUrl: params.evidenceUrl,
      goalId: params.goalId,
      skillId: params.skillId,
      lifeAreaId: params.lifeAreaId,
      projectId: params.projectId,
      taskId: params.taskId,
      activityId: params.activityId,
      occurredAt: params.occurredAt,
    });

    await loadData();
    return event;
  };

  const createAdjustment = async (
    originalEventId: string,
    correctionPoints: number,
    reason: string
  ): Promise<PointLedgerEvent> => {
    const adjustment = await repo.createAdjustment(originalEventId, correctionPoints, reason);
    await loadData();
    return adjustment;
  };

  const practiceMap = useMemo(() => {
    return Object.fromEntries(practices.map((p) => [p.id, p]));
  }, [practices]);

  return {
    practices,
    ledgerEvents,
    metrics,
    filter,
    ledgerFilter,
    loading,
    error,
    practiceMap,
    setFilter,
    setLedgerFilter,
    createPractice,
    updatePractice,
    archivePractice,
    logPracticeCompletion,
    createAdjustment,
    refresh: loadData,
  };
}
