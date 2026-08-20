import React from 'react';
import { WeeklyOverviewData } from '../../types/weekly.types';
import { formatDuration } from '../../utils/formatters';
import { StatWidget } from '../../components/shared/StatWidget';
import { Clock, CheckSquare, ListTodo, Activity } from 'lucide-react';

export interface WeeklyMetricsProps {
  data: WeeklyOverviewData;
}

export const WeeklyMetrics: React.FC<WeeklyMetricsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <StatWidget
        label="Total Output"
        value={formatDuration(data.total_duration_minutes)}
        subtext="Logged in 7 days"
        icon={Clock}
        accentColor="orange"
      />
      <StatWidget
        label="Activities Logged"
        value={data.activities.length}
        subtext="Work sessions"
        icon={Activity}
        accentColor="emerald"
      />
      <StatWidget
        label="Actions Completed"
        value={data.completed_tasks_count}
        subtext="Finished this week"
        icon={CheckSquare}
        accentColor="emerald"
      />
      <StatWidget
        label="Open Actions"
        value={data.remaining_tasks_count}
        subtext="Remaining to do"
        icon={ListTodo}
        accentColor="amber"
      />
    </div>
  );
};
