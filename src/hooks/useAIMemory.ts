import { useState, useEffect, useCallback } from 'react';
import { useAIRepo } from '../app/providers/RepositoryProvider';
import { AIMemory, AIMemoryType, CreateAIMemoryDTO } from '../types/ai.types';

export function useAIMemory(initialType?: AIMemoryType | 'all') {
  const aiRepo = useAIRepo();

  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AIMemoryType | 'all'>(initialType || 'all');

  const fetchMemories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiRepo.getMemories(filterType);
      setMemories(data);
    } catch (err) {
      console.error('Failed to load AI memories:', err);
      setError('Unable to load memory store.');
    } finally {
      setLoading(false);
    }
  }, [aiRepo, filterType]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const saveMemory = async (dto: CreateAIMemoryDTO): Promise<AIMemory> => {
    const created = await aiRepo.saveMemory(dto);
    await fetchMemories();
    return created;
  };

  const archiveMemory = async (id: string): Promise<AIMemory> => {
    const updated = await aiRepo.archiveMemory(id);
    await fetchMemories();
    return updated;
  };

  const deleteMemory = async (id: string): Promise<void> => {
    await aiRepo.deleteMemory(id);
    await fetchMemories();
  };

  return {
    memories,
    loading,
    error,
    filterType,
    setFilterType,
    saveMemory,
    archiveMemory,
    deleteMemory,
    refresh: fetchMemories,
  };
}
