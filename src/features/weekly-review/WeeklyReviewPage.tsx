import React from 'react';
import { useWeeklyData } from '../../hooks/useWeeklyData';
import { WeeklyFocusCard } from './WeeklyFocusCard';
import { WeeklyMetrics } from './WeeklyMetrics';
import { WeeklyDevelopmentPoints } from './WeeklyDevelopmentPoints';
import { WeeklyTimelineGrid } from './WeeklyTimelineGrid';
import { WeeklyGoalSummary } from './WeeklyGoalSummary';
import { useGoals } from '../../hooks/useGoals';
import { useVision } from '../../hooks/useVision';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getISOWeekString } from '../../utils/dateUtils';

export interface WeeklyReviewPageProps {
  onNavigateToDay?: (date: string) => void;
}

export const WeeklyReviewPage: React.FC<WeeklyReviewPageProps> = ({ onNavigateToDay }) => {
  const { currentWeekId, data, loading, changeWeek, saveWeeklyFocus } = useWeeklyData();
  const { rawGoals } = useGoals();
  const { lifeAreas } = useVision();

  const handlePrevWeek = () => {
    const [yearStr, weekStr] = currentWeekId.split('-W');
    let y = parseInt(yearStr, 10);
    let w = parseInt(weekStr, 10) - 1;
    if (w < 1) {
      y -= 1;
      w = 52;
    }
    changeWeek(`${y}-W${String(w).padStart(2, '0')}`);
  };

  const handleNextWeek = () => {
    const [yearStr, weekStr] = currentWeekId.split('-W');
    let y = parseInt(yearStr, 10);
    let w = parseInt(weekStr, 10) + 1;
    if (w > 52) {
      y += 1;
      w = 1;
    }
    changeWeek(`${y}-W${String(w).padStart(2, '0')}`);
  };

  const handleCurrentWeek = () => {
    changeWeek(getISOWeekString());
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Weekly Execution & Overview"
        subtitle="Evaluate weekly focus directives against actual output and activity history."
        badge={<Badge variant="orange">{currentWeekId}</Badge>}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevWeek}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Prev
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCurrentWeek}>
              Current
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextWeek}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        }
      />

      {loading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          {/* Weekly Focus Directives */}
          <WeeklyFocusCard
            weekId={data.week_id}
            startDate={data.start_date}
            endDate={data.end_date}
            focus={data.focus}
            onSaveFocus={async (dto) => {
              await saveWeeklyFocus(dto);
            }}
          />

          {/* Aggregated Output Metrics */}
          <WeeklyMetrics data={data} />

          {/* Development Points earned this week (Module 08 Final) */}
          <WeeklyDevelopmentPoints startDate={data.start_date} endDate={data.end_date} />

          {/* Weekly Goal Hierarchy Execution Summary */}
          <WeeklyGoalSummary
            activities={data.activities}
            tasks={data.tasks}
            goals={rawGoals}
            lifeAreas={lifeAreas}
          />

          {/* 7-Day Matrix */}
          <WeeklyTimelineGrid data={data} onSelectDate={onNavigateToDay} />
        </>
      )}
    </div>
  );
};
