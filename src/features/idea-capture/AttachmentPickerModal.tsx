// ============================================================
// MODULE 11 PATCH — ATTACHMENT PICKER (single shared UI)
// ============================================================
// One centered floating modal used by BOTH the composer and the
// workspace. Choices:
//   [ Image / File ] → native file picker → durable base64 data URL
//   [ Link ]         → URL + optional label (validated)
//   [ Cancel ]
// No inline URL rows, no expanding composer sections.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { X, Image as ImageIcon, Link2, Paperclip } from 'lucide-react';
import { IdeaAttachment } from '../../types/capture.types';

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp,image/gif';

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export interface AttachmentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Returns true when the attachment was accepted (closes the modal). */
  onAdd: (attachment: Omit<IdeaAttachment, 'id' | 'created_at'>) => Promise<boolean> | boolean;
}

type PickerView = 'choose' | 'link';

export const AttachmentPickerModal: React.FC<AttachmentPickerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [view, setView] = useState<PickerView>('choose');
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setView('choose');
      setUrl('');
      setLabel('');
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFilePicked = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported (jpg, jpeg, png, webp, gif).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Image is too large (max 6 MB).');
      return;
    }
    try {
      setBusy(true);
      // Durable persistence: the data URL lives inside the capture record
      // (IndexedDB) — it survives refresh/navigation. blob: URLs do not.
      const dataUrl = await readFileAsDataUrl(file);
      const accepted = await onAdd({ type: 'image', url: dataUrl, label: file.name });
      if (accepted) onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to attach the file.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidHttpUrl(url)) {
      setError('Enter a valid http(s) URL.');
      return;
    }
    try {
      setBusy(true);
      const accepted = await onAdd({
        type: 'link',
        url: url.trim(),
        label: label.trim() || undefined,
      });
      if (accepted) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[6px]" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[420px] rounded-3xl bg-gradient-to-b from-[rgba(26,29,37,0.94)] to-[rgba(9,11,15,0.97)] backdrop-blur-[40px] border border-white/[0.11] shadow-[0_32px_80px_rgba(0,0,0,0.66)] overflow-hidden"
        data-testid="attachment-picker-modal"
      >
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#ff8a4a]/50 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-[#ff8a4a]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#ff8a4a]">
              Add Attachment
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] text-text-muted hover:text-[#fff4ec] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5">
          {view === 'choose' && (
            <div className="space-y-2.5" data-testid="attachment-picker-choices">
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                data-testid="attachment-pick-file"
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.09] hover:border-[#ff8a4a]/40 hover:bg-[#ff6a2a]/10 transition-all text-left cursor-pointer disabled:opacity-50"
              >
                <ImageIcon className="w-5 h-5 text-[#ffb27a]" />
                <span>
                  <span className="block text-sm font-semibold text-[#fff4ec]">Image / File</span>
                  <span className="block text-[11px] text-text-muted">jpg · jpeg · png · webp · gif (max 6 MB)</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView('link')}
                data-testid="attachment-pick-link"
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.09] hover:border-[#ff8a4a]/40 hover:bg-[#ff6a2a]/10 transition-all text-left cursor-pointer"
              >
                <Link2 className="w-5 h-5 text-[#ffb27a]" />
                <span>
                  <span className="block text-sm font-semibold text-[#fff4ec]">Link</span>
                  <span className="block text-[11px] text-text-muted">Any http(s) URL with an optional label</span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGES}
                className="hidden"
                data-testid="attachment-file-input"
                onChange={(e) => void handleFilePicked(e.target.files?.[0] ?? null)}
              />
              {busy && <p className="text-xs text-text-muted">Attaching…</p>}
            </div>
          )}

          {view === 'link' && (
            <form onSubmit={handleAddLink} className="space-y-3" data-testid="attachment-link-form">
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-1.5">
                  URL
                </label>
                <input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  data-testid="attachment-link-url"
                  className="w-full bg-black/40 border border-white/[0.09] focus:border-[#ff8a4a]/45 rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-text-muted mb-1.5">
                  Label (optional)
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Reference article"
                  data-testid="attachment-link-label"
                  className="w-full bg-black/40 border border-white/[0.09] focus:border-[#ff8a4a]/45 rounded-xl px-3.5 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted/50"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={() => { setView('choose'); setError(null); }}>
                  Back
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={busy} disabled={!url.trim()} data-testid="attachment-add-link">
                  Add Link
                </Button>
              </div>
            </form>
          )}

          {error && (
            <p className="mt-3 text-xs text-red-400" data-testid="attachment-picker-error">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
