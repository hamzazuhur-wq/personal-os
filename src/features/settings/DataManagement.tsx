import React, { useState, useRef } from 'react';
import { ExportService, AuraBackupData } from '../../services/backup/exportService';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Download, Upload, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const DataManagement: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const backup = await ExportService.exportAllData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `Aura-Leveling-Backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({ type: 'success', text: 'Backup successfully exported to JSON.' });
    } catch (err) {
      console.error('Export error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to export backup data.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setStatusMessage(null);
      const fileContent = await file.text();
      const parsedData: AuraBackupData = JSON.parse(fileContent);

      await ExportService.importData(parsedData);
      setStatusMessage({ type: 'success', text: 'Backup restored successfully. Reloading...' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error('Import error:', err);
      setStatusMessage({ type: 'error', text: 'Invalid backup file structure.' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = async () => {
    try {
      setIsClearing(true);
      await ExportService.clearAllData();
      setShowClearConfirm(false);
      setStatusMessage({ type: 'success', text: 'All local data cleared. Resetting system...' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Clear error:', err);
      setStatusMessage({ type: 'error', text: 'Failed to clear data.' });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="relative space-y-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] via-white/[0.025] to-white/[0.01] backdrop-blur-3xl border border-white/[0.09] shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden">
      <div>
        <h3 className="text-sm font-bold text-[#fff4ec] uppercase font-mono tracking-[0.18em]">
          Data Engine & Local Portability
        </h3>
        <p className="text-xs text-text-muted mt-1 leading-relaxed">
          Export your entire life operating system database or restore from a portable JSON backup.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          isLoading={isExporting}
          leftIcon={<Download className="w-4 h-4 text-[#ff8a4a]" />}
        >
          Export Database (JSON)
        </Button>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isImporting}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Import Backup
          </Button>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setShowClearConfirm(true)}
          leftIcon={<Trash2 className="w-4 h-4" />}
        >
          Purge Local Data
        </Button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearData}
        title="Purge Local Database"
        message="This action will permanently delete all activities, tasks, captures, and weekly focus records from this device. Please ensure you have exported a JSON backup first."
        confirmLabel="Purge Database"
        isDestructive
        isLoading={isClearing}
      />
    </div>
  );
};
