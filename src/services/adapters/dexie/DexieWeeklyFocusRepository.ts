import { IWeeklyFocusRepository } from '../../contracts/IWeeklyFocusRepository';
import { WeeklyFocus, SetWeeklyFocusDTO } from '../../../types/weekly.types';
import { posDexieDb } from './posDexieDb';

export class DexieWeeklyFocusRepository implements IWeeklyFocusRepository {
  async getByWeekId(weekId: string): Promise<WeeklyFocus | null> {
    const record = await posDexieDb.weekly_focus.get(weekId);
    return record || null;
  }

  async setFocus(dto: SetWeeklyFocusDTO): Promise<WeeklyFocus> {
    const now = new Date().toISOString();
    const record: WeeklyFocus = {
      id: dto.week_id,
      week_id: dto.week_id,
      start_date: dto.start_date,
      end_date: dto.end_date,
      primary_focus: dto.primary_focus.trim(),
      secondary_objectives: dto.secondary_objectives?.filter((obj) => obj.trim().length > 0) || [],
      reflection_notes: dto.reflection_notes?.trim(),
      updated_at: now,
    };

    await posDexieDb.weekly_focus.put(record);
    return record;
  }

  async delete(weekId: string): Promise<boolean> {
    await posDexieDb.weekly_focus.delete(weekId);
    return true;
  }
}
