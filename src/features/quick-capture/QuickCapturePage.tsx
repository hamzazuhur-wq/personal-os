import React, { useRef } from 'react';
import { QuickCaptureInput } from './QuickCaptureInput';
import { CaptureList } from './CaptureList';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { Zap } from 'lucide-react';

export const QuickCapturePage: React.FC = () => {
  const topInputRef = useRef<HTMLDivElement>(null);

  const scrollToInput = () => {
    topInputRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Quick Capture Stream"
        subtitle="Record spontaneous thoughts, architecture concepts, and ideas before they vanish. Capture first, organize later."
        badge={<Badge variant="orange">Raw Stream</Badge>}
      />

      <div ref={topInputRef}>
        <QuickCaptureInput autoFocus />
      </div>

      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3.5">
          <Zap className="w-4 h-4 text-[#ff8a4a]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-[0.18em] text-text-primary">
            Stream Entries & Inbox
          </h3>
        </div>
        <CaptureList onNewCaptureClick={scrollToInput} />
      </div>
    </div>
  );
};
