import { useState, useEffect, useCallback } from 'react';
import { useCaptureRepo } from '../app/providers/RepositoryProvider';
import { Capture, CreateCaptureDTO, UpdateCaptureDTO, CaptureStatus } from '../types/capture.types';

export function useCaptures(statusFilter?: CaptureStatus) {
  const repo = useCaptureRepo();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaptures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await repo.getAll(statusFilter ? { status: statusFilter } : undefined);
      setCaptures(data);
    } catch (err) {
      console.error('Failed to load captures:', err);
      setError('Unable to load captures.');
    } finally {
      setLoading(false);
    }
  }, [repo, statusFilter]);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  const createCapture = async (dto: CreateCaptureDTO): Promise<Capture> => {
    try {
      const created = await repo.create(dto);
      setCaptures((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      console.error('Failed to create capture:', err);
      throw err;
    }
  };

  const updateCapture = async (id: string, dto: UpdateCaptureDTO): Promise<Capture> => {
    try {
      const updated = await repo.update(id, dto);
      setCaptures((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    } catch (err) {
      console.error('Failed to update capture:', err);
      throw err;
    }
  };

  const archiveCapture = async (id: string): Promise<void> => {
    try {
      const updated = await repo.archive(id);
      if (statusFilter && statusFilter !== 'archived') {
        setCaptures((prev) => prev.filter((c) => c.id !== id));
      } else {
        setCaptures((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch (err) {
      console.error('Failed to archive capture:', err);
      throw err;
    }
  };

  const deleteCapture = async (id: string): Promise<void> => {
    try {
      await repo.delete(id);
      setCaptures((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete capture:', err);
      throw err;
    }
  };

  return {
    captures,
    loading,
    error,
    createCapture,
    updateCapture,
    archiveCapture,
    deleteCapture,
    refreshCaptures: fetchCaptures,
  };
}
