import React, { useState } from 'react';
import { Activity } from '../../types/activity.types';
import { ACTIVITY_CATEGORIES } from '../../constants/categories';
import { formatDuration } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Clock, Edit2, Trash2, Archive } from 'lucide-react';

export interface ActivityItemProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const ActivityItem: React.FC<ActivityItemProps> = ({
  activity,
  onEdit,
  onArchive,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const catMeta = ACTIVITY_CATEGORIES.find((c) => c.id === activity.category) || ACTIVITY_CATEGORIES[0];

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await onDelete(activity.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete activity:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border border-white/[0.08] hover:border-[#ff8a4a]/40 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_20px_-8px_rgba(255,106,42,0.2)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group relative overflow-hidden">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* Category Vertical Light Strip with subtle glow */}
          <div
            className="w-1.5 h-11 rounded-full shrink-0 mt-0.5 shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: catMeta.color, color: catMeta.color }}
            title={catMeta.label}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-bold text-[#fff4ec] tracking-tight truncate">
                {activity.title}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-mono text-text-secondary bg-white/[0.04] border border-white/[0.07] uppercase tracking-wider">
                {catMeta.label}
              </span>
            </div>

            {activity.description && (
              <p className="text-xs text-text-secondary line-clamp-2 mt-0.5 leading-relaxed">
                {activity.description}
              </p>
            )}

            {(activity.start_time || activity.end_time) && (
              <div className="text-[11px] font-mono text-text-muted mt-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#ff8a4a]" />
                <span>
                  {activity.start_time || '??'} → {activity.end_time || '??'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Duration & Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/[0.05] shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/[0.1] font-mono text-xs font-bold text-[#fff4ec] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_0_12px_-3px_rgba(255,106,42,0.2)]">
            {formatDuration(activity.duration_minutes)}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(activity)}
              title="Edit Activity"
              className="text-text-muted hover:text-[#fff4ec] p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onArchive(activity.id)}
              title="Archive Record"
              className="text-text-muted hover:text-amber-400 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Record"
              className="text-text-muted hover:text-rose-400 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Activity Log"
        message={`Are you sure you want to delete "${activity.title}"? This record will be permanently removed.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isProcessing}
      />
    </>
  );
};
