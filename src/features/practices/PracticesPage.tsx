import React, { useState } from 'react';
import { usePractices } from '../../hooks/usePractices';
import { useVision } from '../../hooks/useVision';
import { useSkills } from '../../hooks/useSkills';
import { useGoals } from '../../hooks/useGoals';
import { useProjects } from '../../hooks/useProjects';
import { PracticesHeader } from './components/PracticesHeader';
import { PracticeCard } from './components/PracticeCard';
import { PointLedgerTable } from './components/PointLedgerTable';
import {
  DevelopmentOverview,
} from './components/devpoints/DevelopmentOverview';
import { PracticeFormModal } from './forms/PracticeFormModal';
import { LogPracticeModal } from './forms/LogPracticeModal';
import { LedgerAdjustmentModal } from './forms/LedgerAdjustmentModal';
import { Practice, PointLedgerEvent } from '../../types/practice.types';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Award, Zap, History, Search, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

export const PracticesPage: React.FC = () => {
  const {
    practices,
    ledgerEvents,
    metrics,
    filter,
    loading,
    error,
    practiceMap,
    setFilter,
    createPractice,
    updatePractice,
    archivePractice,
    logPracticeCompletion,
    createAdjustment,
    refresh,
  } = usePractices();

  const { lifeAreas } = useVision();
  const { skills } = useSkills();
  const { rawGoals: goals } = useGoals();
  const { projects } = useProjects();

  const [activeTab, setActiveTab] = useState<'development' | 'catalog' | 'ledger'>('development');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);

  const [loggingPractice, setLoggingPractice] = useState<Practice | null>(null);
  const [adjustingEvent, setAdjustingEvent] = useState<PointLedgerEvent | null>(null);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingPractice(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (p: Practice) => {
    setEditingPractice(p);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header & Metrics Strip */}
      <PracticesHeader
        metrics={metrics}
        lifeAreas={lifeAreas}
        skills={skills}
        onOpenCreateModal={handleOpenCreate}
      />

      {/* Main View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-xl">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('development')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
              activeTab === 'development'
                ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/30 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ffb27a]" />
            <span>Development Points</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
              activeTab === 'catalog'
                ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/30 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <Zap className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Practice Catalog ({practices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer',
              activeTab === 'ledger'
                ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/30 shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Point Ledger Audit ({ledgerEvents.length})</span>
          </button>
        </div>

        {/* Search & Filter */}
        {activeTab === 'catalog' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search practices..."
              value={filter.searchQuery || ''}
              onChange={(e) => setFilter({ searchQuery: e.target.value })}
              className="w-full bg-black/40 border border-white/[0.08] text-xs text-text-primary rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-[#ff8a4a]"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading && activeTab !== 'development' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : error && activeTab !== 'development' ? (
        <EmptyState
          icon={Award}
          title="Development Practices Unavailable"
          description={error}
          actionLabel="Retry"
          onAction={refresh}
        />
      ) : activeTab === 'development' ? (
        <DevelopmentOverview lifeAreas={lifeAreas} />
      ) : activeTab === 'catalog' ? (
        practices.length === 0 ? (
          <EmptyState
            icon={Zap}
            title={filter.searchQuery ? 'No matching practices' : 'No Development Practices Defined'}
            description={
              filter.searchQuery
                ? 'Try adjusting your search keywords.'
                : 'Define repeated development habits (e.g. podcast study, deep work, reflections) to award verifiable development points.'
            }
            actionLabel="+ Define First Practice"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {practices.map((practice) => (
              <PracticeCard
                key={practice.id}
                practice={practice}
                lifeAreas={lifeAreas}
                skills={skills}
                goals={goals}
                projects={projects}
                onLogPractice={(p) => setLoggingPractice(p)}
                onEdit={handleOpenEdit}
                onArchive={(id) => setArchiveTargetId(id)}
              />
            ))}
          </div>
        )
      ) : (
        <PointLedgerTable
          events={ledgerEvents}
          practiceMap={practiceMap}
          lifeAreas={lifeAreas}
          skills={skills}
          goals={goals}
          projects={projects}
          onOpenAdjustment={(ev) => setAdjustingEvent(ev)}
        />
      )}

      {/* Modals */}
      {/* 1. Practice Definition Form */}
      <PracticeFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        practiceToEdit={editingPractice}
        lifeAreas={lifeAreas}
        skills={skills}
        goals={goals}
        projects={projects}
        onSave={async (dto) => {
          if (editingPractice) {
            await updatePractice(editingPractice.id, dto);
          } else {
            await createPractice(dto);
          }
        }}
      />

      {/* 2. Log Practice Completion */}
      <LogPracticeModal
        isOpen={Boolean(loggingPractice)}
        onClose={() => setLoggingPractice(null)}
        practice={loggingPractice}
        goals={goals}
        skills={skills}
        onConfirm={async (params) => {
          await logPracticeCompletion(params);
        }}
      />

      {/* 3. Immutable Ledger Adjustment Modal */}
      <LedgerAdjustmentModal
        isOpen={Boolean(adjustingEvent)}
        onClose={() => setAdjustingEvent(null)}
        event={adjustingEvent}
        onConfirm={async (eventId, points, reason) => {
          await createAdjustment(eventId, points, reason);
        }}
      />

      {/* 4. Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={Boolean(archiveTargetId)}
        onClose={() => setArchiveTargetId(null)}
        onConfirm={async () => {
          if (archiveTargetId) {
            await archivePractice(archiveTargetId);
            setArchiveTargetId(null);
          }
        }}
        title="Archive Development Practice"
        message="Are you sure you want to archive this practice? Existing points in the ledger will remain completely intact."
        confirmLabel="Archive Practice"
      />
    </div>
  );
};
