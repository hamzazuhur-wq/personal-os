import React, { useState } from 'react';
import { TaskList } from './TaskList';
import { TaskFormModal } from './TaskFormModal';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useTasks } from '../../hooks/useTasks';
import { Plus } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { createTask, counts } = useTasks();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Actions & Task Execution"
        subtitle="Manage high-priority actions. History and completion timestamps are permanently preserved."
        badge={<Badge variant="orange">{counts.active} Active Items</Badge>}
        action={
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            + New Action
          </Button>
        }
      />

      <TaskList onNewTaskClick={() => setIsModalOpen(true)} />

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={async (dto) => {
          await createTask(dto as any);
        }}
      />
    </div>
  );
};
