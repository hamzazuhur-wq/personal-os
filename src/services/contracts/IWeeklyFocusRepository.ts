import { WeeklyFocus, SetWeeklyFocusDTO } from '../../types/weekly.types';

export interface IWeeklyFocusRepository {
  getByWeekId(weekId: string): Promise<WeeklyFocus | null>;
  setFocus(dto: SetWeeklyFocusDTO): Promise<WeeklyFocus>;
  delete(weekId: string): Promise<boolean>;
}
