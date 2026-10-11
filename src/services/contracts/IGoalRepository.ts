import { CreateGoalDTO, Goal, GoalFilter, UpdateGoalDTO } from '../../types/goal.types';

export interface IGoalRepository {
  getGoals(filter?: GoalFilter): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | null>;
  createGoal(dto: CreateGoalDTO): Promise<Goal>;
  updateGoal(id: string, dto: UpdateGoalDTO): Promise<Goal>;
  completeGoal(id: string, completionNote?: string): Promise<Goal>;
  pauseGoal(id: string): Promise<Goal>;
  resumeGoal(id: string): Promise<Goal>;
  archiveGoal(id: string): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;
  getChildGoals(parentGoalId: string): Promise<Goal[]>;
  getGoalPath(goalId: string): Promise<Goal[]>;
  getGoalDescendants(goalId: string): Promise<Goal[]>;
  moveGoal(id: string, newParentGoalId: string | null): Promise<Goal>;
}
