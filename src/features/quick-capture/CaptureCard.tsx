import React, { useState } from 'react';
import { Capture, CaptureType, CaptureStatus } from '../../types/capture.types';
import { CAPTURE_TYPES } from '../../constants/categories';
import { formatTimeAgo } from '../../utils/dateUtils';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Archive, Trash2, Edit2, Check, X, ArrowUpRight } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CaptureCardProps {
  capture: Capture;
  onUpdate: (id: string, updates: { content?: string; capture_type?: CaptureType; status?: CaptureStatus }) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const CaptureCard: React.FC<CaptureCardProps> = ({
  capture,
  onUpdate,
  onArchive,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(capture.content);
  const [editType, setEditType] = useState<CaptureType>(capture.capture_type);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const typeConfig = CAPTURE_TYPES.find((t) => t.id === capture.capture_type) || CAPTURE_TYPES[0];

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      setIsProcessing(true);
      await onUpdate(capture.id, {
        content: editContent.trim(),
        capture_type: editType,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update capture:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkOrganized = async () => {
    try {
      setIsProcessing(true);
      await onUpdate(capture.id, {
        status: capture.status === 'organized' ? 'inbox' : 'organized',
      });
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await onDelete(capture.id);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Failed to delete capture:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'p-4 sm:p-5 rounded-xl bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-2xl border transition-all duration-200 flex flex-col gap-3 group relative overflow-hidden',
          capture.status === 'inbox'
            ? 'border-white/[0.08] hover:border-[#ff8a4a]/40 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4),0_0_20px_-8px_rgba(255,106,42,0.2)]'
            : 'border-white/[0.05] opacity-80'
        )}
      >
        {/* Card Header: Type Badge, Status, Timestamp */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn('text-[10px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider border select-none', typeConfig.badgeColor)}>
              {typeConfig.label}
            </span>
            {capture.status === 'organized' && (
              <Badge variant="emerald" size="sm">Organized</Badge>
            )}
            {capture.status === 'archived' && (
              <Badge variant="slate" size="sm">Archived</Badge>
            )}
          </div>

          <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            {formatTimeAgo(capture.created_at)}
          </div>
        </div>

        {/* Card Content or Edit Form */}
        {isEditing ? (
          <div className="flex flex-col gap-2.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full bg-black/60 backdrop-blur-xl border border-[#ff8a4a]/50 text-text-primary text-sm rounded-lg p-3 outline-none focus:shadow-[0_0_15px_-3px_rgba(255,106,42,0.3)]"
            />
            <div className="flex items-center justify-between">
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as CaptureType)}
                className="bg-black/40 border border-white/10 text-xs text-text-primary rounded-lg px-2.5 py-1.5 outline-none"
              >
                {CAPTURE_TYPES.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0f1218]">
                    {t.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveEdit} isLoading={isProcessing}>
                  <Check className="w-3.5 h-3.5" /> Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {capture.content}
          </p>
        )}

        {/* Card Footer: Actions */}
        {!isEditing && (
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <button
              onClick={handleMarkOrganized}
              disabled={isProcessing}
              className={cn(
                'text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer',
                capture.status === 'organized'
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-text-muted hover:text-[#ff8a4a]'
              )}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{capture.status === 'organized' ? 'Move to Inbox' : 'Mark Organized'}</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(true)}
                title="Edit Capture"
                className="text-text-muted hover:text-[#fff4ec] p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              {capture.status !== 'archived' && (
                <button
                  onClick={() => onArchive(capture.id)}
                  title="Archive Capture"
                  className="text-text-muted hover:text-amber-400 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Permanently"
                className="text-text-muted hover:text-rose-400 p-1.5 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Capture"
        message="Are you sure you want to permanently delete this capture?"
        confirmLabel="Delete"
        isDestructive
        isLoading={isProcessing}
      />
    </>
  );
};
