import { TaskPriority, TaskStatus } from '../types/task.types';

export const TASK_PRIORITIES: {
  id: TaskPriority;
  label: string;
  color: string;
  badgeStyle: string;
}[] = [
  { id: 'urgent', label: 'Urgent', color: '#f43f5e', badgeStyle: 'border-rose-500/40 text-rose-300 bg-rose-500/10' },
  { id: 'high', label: 'High', color: '#ff6a2a', badgeStyle: 'border-[#ff8a4a]/50 text-[#fff4ec] bg-[#ff6a2a]/20 shadow-[0_0_10px_rgba(255,106,42,0.2)]' },
  { id: 'medium', label: 'Medium', color: '#ffb27a', badgeStyle: 'border-[#ffb27a]/30 text-[#ffb27a] bg-[#ff6a2a]/10' },
  { id: 'low', label: 'Low', color: '#94a3b8', badgeStyle: 'border-white/10 text-slate-400 bg-white/[0.03]' },
];

export const TASK_STATUSES: {
  id: TaskStatus;
  label: string;
}[] = [
  { id: 'not_started', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];
