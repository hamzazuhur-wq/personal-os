import React from 'react';
import { Activity } from '../../types/activity.types';
import { ActivityItem } from './ActivityItem';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Calendar } from 'lucide-react';

export interface ActivityTimelineProps {
  activities: Activity[];
  loading: boolean;
  onEdit: (activity: Activity) => void;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddClick: () => void;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  loading,
  onEdit,
  onArchive,
  onDelete,
  onAddClick,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No work recorded for this date"
        description="Record what you actually accomplished. Log focused deep work sessions, physical training, study, or operational output."
        actionLabel="+ Record First Activity"
        onAction={onAddClick}
      />
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
