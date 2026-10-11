import React, { useState } from 'react';
import { useAIAgent } from '../../hooks/useAIAgent';
import { useAIMemory } from '../../hooks/useAIMemory';
import { useAISettings } from '../../hooks/useAISettings';
import { AIConversationSidebar } from './components/AIConversationSidebar';
import { AIChat } from './components/AIChat';
import { AIContextPanel } from './components/AIContextPanel';
import { AISettingsPanel } from './components/AISettingsPanel';
import { AIMemoryManagerModal } from './components/AIMemoryManagerModal';
import { AIAuditLogModal } from './components/AIAuditLogModal';
import { AIConversationGroupModal } from './components/AIConversationGroupModal';
import { Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

export const AIPage: React.FC = () => {
  const {
    conversations,
    groups,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    messages,
    isProcessing,
    streamingText,
    filter,
    setFilter,
    sendMessage,
    stopGeneration,
    approveAction,
    rejectAction,
    createNewConversation,
    updateConversationTitle,
    setConversationCategory,
    togglePinConversation,
    archiveConversation,
    createGroup,
    updateGroup,
    archiveGroup,
  } = useAIAgent();

  const {
    memories,
    saveMemory,
    archiveMemory,
    deleteMemory,
  } = useAIMemory();

  const { settings } = useAISettings();

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Responsive sidebar/context drawer state for smaller screens
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-16">
      {/* ─── Top Header with Mobile Drawer Triggers ───────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#ff6a2a]/10 border border-[#ff8a4a]/25 text-[#ff8a4a]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#fff4ec] tracking-tight">
              AI Intelligence
            </h1>
            <p className="text-xs text-text-secondary hidden sm:block">
              Analyze, retrieve, and execute actions across your Personal OS with human-in-the-loop approvals.
            </p>
          </div>
        </div>

        {/* Mobile Sidebar Toggle Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={() => setIsSidebarOpenMobile((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-black/40 text-xs font-mono text-[#fff4ec]"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#ff8a4a]" />
            <span>Threads</span>
          </button>
        </div>
      </div>

      {/* ─── 3-Column Responsive Grid ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Conversation Sidebar (3 Cols) */}
        <div
          className={cn(
            'lg:col-span-3 h-[760px]',
            isSidebarOpenMobile
              ? 'fixed inset-4 z-40 block lg:relative lg:inset-auto'
              : 'hidden lg:block'
          )}
        >
          {isSidebarOpenMobile && (
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm lg:hidden z-30"
              onClick={() => setIsSidebarOpenMobile(false)}
            />
          )}
          <div className="relative z-40 h-full">
            <AIConversationSidebar
              conversations={conversations}
              groups={groups}
              activeConversationId={activeConversationId}
              filter={filter}
              onFilterChange={setFilter}
              onSelectConversation={(id) => {
                setActiveConversationId(id);
                setIsSidebarOpenMobile(false);
              }}
              onNewConversation={() => {
                createNewConversation();
                setIsSidebarOpenMobile(false);
              }}
              onTogglePin={togglePinConversation}
              onArchiveConversation={archiveConversation}
              onOpenGroupManager={() => setIsGroupModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        </div>

        {/* CENTER COLUMN: Chat Feed & Input (6 or 9 Cols depending on Context Panel) */}
        <div className={cn(isContextPanelOpen ? 'lg:col-span-6' : 'lg:col-span-9')}>
          <AIChat
            conversation={activeConversation}
            messages={messages}
            isProcessing={isProcessing}
            streamingText={streamingText}
            settings={settings}
            onSendMessage={sendMessage}
            onStopGeneration={stopGeneration}
            onApproveAction={approveAction}
            onRejectAction={rejectAction}
            onUpdateTitle={(title) => {
              if (activeConversationId) updateConversationTitle(activeConversationId, title);
            }}
            onUpdateCategory={(cat) => {
              if (activeConversationId) setConversationCategory(activeConversationId, cat);
            }}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleContextPanel={() => setIsContextPanelOpen((prev) => !prev)}
            isContextOpen={isContextPanelOpen}
          />
        </div>

        {/* RIGHT COLUMN: Context & Memories Panel (3 Cols) */}
        {isContextPanelOpen && (
          <div className="lg:col-span-3 space-y-5">
            <AIContextPanel
              memories={memories}
              settings={settings}
              onOpenMemoryManager={() => setIsMemoryModalOpen(true)}
              onOpenAuditLog={() => setIsAuditModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────── */}
      <AISettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AIMemoryManagerModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={memories}
        onSaveMemory={saveMemory}
        onArchiveMemory={archiveMemory}
        onDeleteMemory={deleteMemory}
      />

      <AIAuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />

      <AIConversationGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        groups={groups}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onArchiveGroup={archiveGroup}
      />
    </div>
  );
};
