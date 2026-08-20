import { Capture, CreateCaptureDTO, UpdateCaptureDTO, CaptureStatus } from '../../types/capture.types';

export interface ICaptureRepository {
  getAll(filter?: { status?: CaptureStatus }): Promise<Capture[]>;
  getById(id: string): Promise<Capture | null>;
  getRecent(limit?: number): Promise<Capture[]>;
  create(dto: CreateCaptureDTO): Promise<Capture>;
  update(id: string, dto: UpdateCaptureDTO): Promise<Capture>;
  archive(id: string): Promise<Capture>;
  delete(id: string): Promise<boolean>;
  getInboxCount(): Promise<number>;
}
