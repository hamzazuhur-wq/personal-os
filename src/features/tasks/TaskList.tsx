import React, { useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { TaskItem } from './TaskItem';
import { TaskFormModal } from './TaskFormModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../../types/task.types';
import { CheckSquare, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TaskListProps {
  onNewTaskClick?: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ onNewTaskClick }) => {
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    tasks,
    counts,
    loading,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
  } = useTasks(filterStatus === 'all' ? undefined : filterStatus);

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      return (
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return true;
  });

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSave = async (dto: CreateTaskDTO | UpdateTaskDTO) => {
    if (editingTask) {
      await updateTask(editingTask.id, dto as UpdateTaskDTO);
    } else {
      await createTask(dto as any);
    }
  };

  const tabs: { id: TaskStatus | 'all'; label: string; count?: number }[] = [
    { id: 'all', label: 'All Actions', count: counts.total },
    { id: 'not_started', label: 'To Do', count: counts.active },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="space-y-4">
      {/* Top Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-xl p-1 rounded-xl border border-white/[0.08] w-fit shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                'px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center gap-2',
                filterStatus === tab.id
                  ? 'bg-gradient-to-r from-[#ff6a2a]/20 to-[#ff8a4a]/10 text-[#fff4ec] border border-[#ff8a4a]/40 shadow-[0_2px_12px_rgba(255,106,42,0.2)] font-bold'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:w-56">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search actions..."
            className="w-full bg-black/40 backdrop-blur-xl border border-white/[0.08] text-text-primary text-xs rounded-lg pl-8 pr-3 py-1.5 min-h-[36px] outline-none focus:border-[#ff8a4a]/60 focus:shadow-[0_0_12px_rgba(255,106,42,0.2)]"
          />
        </div>
      </div>

      {/* Task Item List */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={searchQuery ? 'No matching actions found' : 'No actions in this view'}
          description={
            searchQuery
              ? 'Try modifying your search term.'
              : 'Add actions to track purposeful daily execution.'
          }
          actionLabel={onNewTaskClick ? '+ Create Action Item' : undefined}
          onAction={onNewTaskClick}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleComplete={async (id, isComp) => {
                await toggleTaskCompletion(id, isComp);
              }}
              onEdit={handleEdit}
              onDelete={deleteTask}
            />
          ))}
        </div>
      )}

      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskToEdit={editingTask}
        onSave={handleSave}
      />
    </div>
  );
};
